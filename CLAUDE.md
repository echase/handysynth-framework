# HandySynth — Project Context

## What This Is

A platform for building spatial hand-tracked musical instruments in the browser. The core handles MediaPipe hand tracking, pinch gesture detection, depth estimation, pitch mapping, and startup orchestration. Variants implement audio engines and visual themes on top.

## Research Foundation

Two shared modules — `effort-curves.js` and `lumini.js` — are grounded in a multi-domain
research corpus on embodied musicality. Before designing gesture→sound mappings or
sound→visual mappings, read the research:

- **BrainMaster:** `brain read embodied-musicality-corpus` — the index of all sources
- **Entry points (in order):**
  1. `docs/embodied-musicality-context-primer-2026-07-09-reference.md` — gesture→sound: Laban, Godøy, Cadoz, effort-as-control
  2. `docs/lumini-sound-to-light-mapping-2026-07-09-synthesis.md` — sound→light: crossmodal correspondences, emotion-mediation, engineering practice
- **Master paper** (when it exists): `docs/embodied-musicality-design-framework-2026-07-10-synthesis.md` — the full arc, platform-agnostic
- **ADR 011:** `docs/adr/011-effort-curves-over-coordinates.md` — why effort, not coordinates

## Architecture

```
handysynth.js                    ← Core platform (gesture + tracking + mapping)
variants/
  _template/                     ← Copy this to start a new instrument
    variant.js                   ← Callback hooks (onNoteOn, onFrame, etc.)
    index.html                   ← DOM shell + wiring
  pyrefey/                       ← First variant: fire wizardry / fey magik
    pyrefey.js                   ← FM synthesis + 6 particle systems + mandala
    index.html                   ← Themed DOM shell
```

## Core Platform (`handysynth.js`)

**Exports:**
- `HandySynth` class — mount, configure, run
- `SCALES` — 15 built-in scales (pentatonic through chromatic + world scales)
- `xToFreq(normX, scale, rootHz, octaveShift)` — pitch mapping
- `estimateDepth(landmarks, opts)` — Z-axis estimation
- `pinchDistance(landmarks, tipIdx)` — thumb-to-finger distance
- `freqToNote(freq)`, `freqToMidi(freq)` — note utilities
- Constants: `FINGER_TIPS`, `THUMB_TIP`, `FINGER_NAMES`, `HAND_CONNECTIONS`, `NOTE_NAMES`

**What the core handles:**
- MediaPipe Tasks Vision HandLandmarker init (WASM + model load)
- Camera setup via getUserMedia
- Click-to-start overlay (AudioContext gesture gating)
- Pinch detection with hysteresis (configurable thresholds)
- Depth estimation (palm span + landmark Z, blended, power-curved)
- Pitch quantization to scale
- XYZ → freq/vol/depth mapping (reversible pitch direction)
- Left/right hand octave offset
- Frame loops (separate render + detection loops)
- Vanished-hand voice release

**What variants handle:**
- Audio engine (oscillators, filters, effects, voice allocation)
- Visual rendering (particles, skeleton style, background, spectrum viz)
- Any variant-specific gesture interpretation beyond pinch on/off
- DOM controls (scale selector, root selector, mode switches)

## Gesture Vocabulary

Reusable gesture primitives beyond pinch on/off. `estimateDepth` and `pinchDistance` ship in core
(`handysynth.js`); `handOpenness` and `handTwist` are proven helpers variants currently **inline** — copy the
reference implementations below (single-file apps, so copy, don't import). Proven on `theremin` (Round 2).

| Primitive | Returns | Source | Notes |
|-----------|---------|--------|-------|
| `pinchDistance(lms, tipIdx)` | thumb→finger distance | core | drives pinch on/off |
| `estimateDepth(lms)` | 0 near … 1 far | core | palm-span + landmark Z, power-curved |
| `handOpenness(lms)` | 0 fist … 1 open | inline (from `drift`) | normalized by palm size |
| `handTwist(lms)` | radians, in-plane | inline (new on `theremin`) | see caveat ⚠ |

```javascript
function dist3(a, b) { return Math.hypot(a.x-b.x, a.y-b.y, (a.z||0)-(b.z||0)); }
function palmSize(lms) { return dist3(lms[0], lms[9]) || 0.001; }
// 0 = fist, 1 = fully open — sum of fingertip→wrist distances / palm size
function handOpenness(lms) {
  const ps = palmSize(lms); let sum = 0;
  for (let fi = 0; fi < 4; fi++) sum += dist3(lms[FINGER_TIPS[fi]], lms[0]) / ps;
  return Math.max(0, Math.min(1, (sum / 4 - 1.0) / 1.15));
}
// In-plane hand rotation: angle of the wrist→middle-MCP axis (landmarks 0→9)
function handTwist(lms) { return Math.atan2(lms[9].y - lms[0].y, lms[9].x - lms[0].x); }
```

**⚠ Twist is steering-wheel, not pronation.** `handTwist` measures rotation **in the image plane** only.
True forearm pronation (palm-up ↔ palm-down) is **not recoverable from 2D landmarks** — don't try. Because the
absolute angle has no natural zero, **calibrate a baseline** (capture the neutral angle on engage) and drive
controls from the *delta*. Smooth with a **shortest-arc EMA** (unwrap the angle: `d = atan2(sin(d), cos(d))`)
or the value jumps at the ±π wrap.

**Effect-hand axis set.** A single hand yields a five-way continuous-control vocabulary, useful for mapping one
hand to effect parameters: **Y-Lift** (`1 - tip.y`) · **X-Slide** (`1 - tip.x`) · **Z-Pull** (`estimateDepth`) ·
**T-Twist** (`handTwist`) · **G-Grip** (`handOpenness`). Positional axes are already 0..1; twist normalizes via
`clamp01(0.5 + twist·k)` around its baseline.

**Two-hand role assignment** — never trust the MediaPipe `handedness` label for distinct per-hand roles; it
flips on crossing/occlusion. Assign by behavior or X-position. See `concerns/two-hand-role-stability.md`.

## Variant Callback Interface

```javascript
{
  onInit({ audioCtx, analyser, masterGain, canvas, ctx, W, H })
  onNoteOn({ hand, finger, fingerName, freq, vol, depth, cx, cy })
  onNoteUpdate({ hand, finger, fingerName, freq, vol, depth, cx, cy })
  onNoteOff({ hand, finger, fingerName, cx, cy })
  onFrame({ hands, pinchState, canvas, ctx, W, H, audioCtx, analyser, masterGain, dt })
  onResize({ W, H })          // optional
  onDestroy()                  // optional
}
```

`hands` array entries: `{ landmarks: Array(21), label: 'Left'|'Right', depth: 0-1 }`

`pinchState` object: `{ "Left_0": bool, "Right_3": bool, ... }` — keys are `{hand}_{fingerIndex}`

## HandySynth Constructor Options

```javascript
new HandySynth({
  variant,
  options: {
    pinchOn:          0.062,       // pinch trigger threshold
    pinchOff:         0.092,       // pinch release threshold
    defaultScale:     'pentatonic', // key into SCALES
    rootFreq:         130.81,      // Hz
    reversePitch:     true,        // right = high
    leftOctaveShift:  0,
    rightOctaveShift: 1,
    masterVolume:     0.7,
    numHands:         2,
  },
});
```

## Creating a New Variant

1. Copy `variants/_template/` to `variants/your-name/`
2. Implement callbacks in `variant.js`
3. Theme `index.html` (styles, controls, overlay)
4. Wire controls to `hs.setScale()`, `hs.setRoot()`, `hs.setVolume()`
5. **Apply all items from `VARIANT-POLISH.md`** (v1.2) — 16 mandatory UX refinements (motion smoothing, master-bus pause, full-screen help, immersive mode, stuck-note prevention, click-free ramps, contrast floor, swap-and-pop, etc.) that every variant must include

The audio graph topology is up to you. The core provides `masterGain` → `analyser` → `destination`. Connect your audio into `masterGain`. If you need reverb, compression, or other bus effects, build them in `onInit` and route through `masterGain`.

## Critical Constraints

- **HTTPS required** — getUserMedia blocks on plain HTTP
- **ES modules** — all JS uses `import/export`, served via `<script type="module">`
- **No build step** — files served directly, CDN dependencies loaded at runtime
- **iOS Safari audio unlock** — `_initAudio()` is `async` (v1.1+). `_start()` must `await` it. The resume and silent warm-up buffer must execute inside the direct user gesture callback — calling `audioCtx.resume()` from a `requestAnimationFrame` loop is too late for iOS and will silently fail. Never move the resume back to the frame loop.
- **MediaPipe CDN**: `@mediapipe/tasks-vision@0.10.18` pinned on jsdelivr; model from `storage.googleapis.com`

## Pyrefey Variant Details

- 4 per-finger voices: Sigil (saw lead), Ember (pad), Crystal (bells), Howl (FM)
- Z-axis drives filter cutoff (`d^1.5`), resonance (`d^2`), reverb send (`d^1.3`), and FM depth
- 6 particle systems: bg embers, fire trails, bursts, rune glyphs, smoke, ripples
- Sacred geometry mandala pulsing with FFT energy
- Convergence arc between wrists when both hands present
- Named tunings map to core scales: Hearth→pentatonic, Shadow→minor, Ritual→phrygian, Arcane→harmonic minor, Eastern→in-sen

## Variant Ideas (not yet built)

- **Theremin** — single-finger continuous pitch, no pinch needed, Y=volume
- **Drum machine** — palm-strike detection, percussion samples, grid sequencer
- **Ambient pad** — full-hand open/close gesture, granular synthesis
- **Harp** — strum detection across multiple fingers in sequence
- **Loop station** — record + overdub gestures, visual loop waveform
