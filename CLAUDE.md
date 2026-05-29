# HandySynth — Project Context

## What This Is

A platform for building spatial hand-tracked musical instruments in the browser. The core handles MediaPipe hand tracking, pinch gesture detection, depth estimation, pitch mapping, and startup orchestration. Variants implement audio engines and visual themes on top.

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
5. **Apply all items from `VARIANT-POLISH.md`** — 13 mandatory UX refinements (motion smoothing, pause, help, immersive mode, stuck-note prevention, etc.) that every variant must include

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
