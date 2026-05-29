# PYREFEY — Developer Onboarding

**Version**: 2.1  
**Stack**: Vanilla JS (ES module), Web Audio API, Canvas 2D, MediaPipe Tasks Vision  
**Build step**: None. Single HTML file. No bundler, no framework, no node_modules.

---

## Quick Start

1. Clone/fork the repo
2. Serve `index.html` over HTTPS (camera requires TLS)
3. Open in Chrome, click the overlay, grant camera
4. Raise your hands

For local dev, `npx serve .` or `python3 -m http.server` will work if your browser permits camera on localhost. Chrome allows `localhost` without TLS. Safari does not — use `mkcert` + a local TLS proxy if developing on Safari.

---

## Architecture Overview

The app has four subsystems that talk to each other through shared state, not events. There's no pub/sub, no event bus, no framework abstractions. Understanding the data flow is the whole game.

```
┌─────────────┐    landmarks[]    ┌──────────────┐
│  MediaPipe   │ ───────────────► │   Gesture     │
│  HandLander  │                  │   Engine      │
└─────────────┘                   └──────┬───────┘
                                         │
                          pinchState{} ──►├──► noteOn/update/noteOff
                          depth, x, y    │
                                         ▼
                                  ┌──────────────┐
┌─────────────┐   analyser FFT    │    Audio      │
│   Visual    │ ◄──────────────── │    Engine     │
│   Engine    │                   │  (Web Audio)  │
└─────────────┘                   └──────────────┘
```

Everything runs in two `requestAnimationFrame` loops — `drawLoop()` for rendering and `processFrame()` for hand detection + audio. They share state through module-scoped variables, not function arguments.

---

## Startup Sequence

This is order-dependent. Getting it wrong produces silent failures.

```
User clicks overlay
  └─► initAudio()        — creates AudioContext (MUST be user-gesture-gated)
  └─► initVoices()       — builds 8 Voice objects (2 hands × 4 fingers)
  └─► initPinchState()   — zeroes all pinch booleans
  └─► initMediaPipe()    — loads WASM + model (~12MB first load, cached after)
  └─► initCamera()       — getUserMedia, waits for loadedmetadata
  └─► drawLoop()         — starts visual rendering
  └─► processFrame()     — starts hand detection + audio processing
```

**Why the overlay exists**: `AudioContext` requires a user gesture to construct on modern browsers. `getUserMedia` requires either HTTPS or localhost. The click-to-start pattern satisfies both constraints in one interaction.

---

## Subsystem Details

### 1. Hand Tracking (`initMediaPipe`, `processFrame`)

**API**: `@mediapipe/tasks-vision@0.10.18` — the Tasks Vision API, not the older `@mediapipe/hands` (deprecated, unreliable CDN).

**Model**: `hand_landmarker.task` (float16) from Google Cloud Storage. ~12MB, browser-cached after first load. GPU delegate requested, auto-falls back to CPU.

**Frame processing**: `handLandmarker.detectForVideo(videoEl, timestamp)` runs synchronously per frame. Returns `results.landmarks` (array of 21-point hand skeletons) and `results.handednesses` (Left/Right classification).

**Landmark coordinate space**: All values are 0–1 normalized. `x` is horizontal (0=left edge of frame, 1=right edge). `y` is vertical (0=top, 1=bottom). `z` is depth relative to wrist, negative values = closer to camera. The video element is CSS-mirrored (`scaleX(-1)`) so canvas coordinates flip x: `canvasX = (1 - landmark.x) * W`.

**Handedness labeling**: MediaPipe labels hands as if looking at the person (not from the person's perspective). In the mirrored camera view, the label matches the physical hand — `Right` is your right hand.

**Key gotcha**: `detectForVideo` will throw if called with the same timestamp twice. The `lastTimestamp` guard prevents this. If you refactor the frame loop, preserve that check.

### 2. Gesture Engine (inside `processFrame`)

**Pinch detection**: Euclidean distance between thumb tip (landmark 4) and each finger tip (landmarks 8, 12, 16, 20) in normalized coordinate space. Two thresholds with hysteresis:

- `PINCH_ON = 0.062` — distance below this triggers note-on
- `PINCH_OFF = 0.092` — distance must exceed this to trigger note-off

The gap between thresholds prevents rapid on/off flickering at the boundary. If you're getting jitter, widen the gap. If pinches feel unresponsive, lower `PINCH_ON`.

**Depth estimation** (`handDepth`): Blends two signals — palm span (distance from wrist landmark 0 to middle MCP landmark 9, 70% weight) and average fingertip Z values from MediaPipe (30% weight). A `^0.55` power curve compresses the range so small movements near neutral register more and extreme depth doesn't clip.

**Pitch mapping** (`xToFreq`): `px = 1 - tip.x` reverses the spatial relationship so physical right = higher pitch (matching keyboard orientation in the mirrored view). The normalized x value indexes into the current scale's semitone array. Left hand plays one octave below right hand.

**Volume**: `py = 1 - tip.y` — higher hand position = louder, clamped to 0.05–1.0.

### 3. Audio Engine

**Graph topology per voice**:

```
osc1 ──┐
       ├──► filter (lowpass) ──┬──► vGain ──► masterGain ──► analyser ──► destination
osc2 ──┘                      │
                               └──► reverbSend ──► convolver ──► reverbReturn ──► masterGain
modOsc ──► modGain ──► osc1.frequency  (FM, Howl mode only)
```

**Voice allocation**: 8 voices total, statically assigned. `voices["Right_0"]` is right hand index finger, always. No voice stealing, no dynamic allocation. Each voice has its own filter, gain, and reverb send — so per-finger Z-axis modulation is independent.

**Per-finger voice identities** (hardcoded in `FINGER_MODES`):

| Finger Index | fi | Mode | Oscillator Config | Character |
|---|---|---|---|---|
| Index (tip 8) | 0 | `sigil` | dual sawtooth, -8 cent detune | Cutting lead |
| Middle (tip 12) | 1 | `ember` | sine + triangle, +7 cent detune | Warm pad, slow attack |
| Ring (tip 16) | 2 | `crystal` | dual sine, +1200 cent (octave) detune | Shimmer bells, auto-decay |
| Pinky (tip 20) | 3 | `howl` | sine + sine (P5), FM modulator at 2.37× ratio | FM synthesis, wild |

**Z-axis → audio parameter mapping** (three exponential curves):

| Parameter | Function | Range | Curve |
|---|---|---|---|
| Filter cutoff | `depthToFilter(d)` | 80 Hz → 16 kHz | `d^1.5` |
| Filter Q | `depthToQ(d)` | 1 → 19 | `d^2` |
| Reverb send | `depthToReverb(d)` | 0.02 → 0.77 | `d^1.3` |

Howl mode additionally scales FM modulation index with depth: `freq * (1.2 + reverbAmt * 2.5)`.

**Reverb**: Algorithmic impulse response built at init — 4-second decay with early reflections. Not a convolution of a real IR. If you want to swap in a recorded IR, replace `buildImpulse()` with a fetch of a WAV/OGG buffer and assign it to `convolver.buffer`.

**Scales** (semitone offsets from root):

| Name | Intervals | Character |
|---|---|---|
| `hearth` | 0,2,4,7,9… | Pentatonic — everything sounds good together |
| `shadow` | 0,2,3,5,7,8,10… | Natural minor |
| `ritual` | 0,1,3,5,7,8,10… | Phrygian — darkest diatonic mode |
| `arcane` | 0,2,3,5,7,8,11… | Harmonic minor — augmented 2nd interval |
| `eastern` | 0,1,5,7,10… | In-Sen / Japanese pentatonic |

Root defaults to C3 (130.81 Hz). Right hand plays one octave above left.

### 4. Visual Engine

**Rendering**: Canvas 2D, no WebGL. Full-viewport canvas at native resolution. Frame clear is a semi-transparent fill (`rgba(6,6,11,0.14)`) creating motion trails rather than a hard clear.

**Composite layering order** (back to front):

1. Mandala (sacred geometry, rotates with audio energy)
2. Background embers (ambient, always rising)
3. Flame spectrum (FFT data as organic fire curves, 3 layers)
4. Fire trails + bursts (rendered in `lighter` composite mode for additive glow)
5. Smoke (note-off wisps)
6. Ripples (pinch trigger rings)
7. Rune glyphs (floating Elder Futhark + note name on note-on)
8. Convergence arc (energy beam between wrists when both hands present)
9. Hand skeleton + fingertip glows

**Particle systems** (6 total, each with a hard cap):

| System | Cap | Spawned by | Dies by |
|---|---|---|---|
| `BG_EMBERS` | 80 | Continuous, from bottom | Life decay or off-screen |
| `FIRE` | 140 | Active (pinched) fingertips | Life decay |
| `BURSTS` | 60 | Pinch event (note-on) | Life decay |
| `RUNE_GLYPHS` | 20 | Pinch event | Life decay |
| `SMOKE` | 40 | Release event (note-off) | Life decay |
| `RIPPLES` | unbounded | Pinch event | Life decay |

**Mandala energy**: `mandalaEnergy` is derived from the FFT analyser's average bin value. It drives mandala rotation speed, ring opacity, and base radius. `currentDepthViz` is a smoothed version of the maximum hand depth across all detected hands, used to pulse the mandala radius and rotation.

---

## Extension Points

### Adding a new voice/finger mode

1. Add the mode name to `FINGER_MODES` array (currently `['sigil','ember','crystal','howl']`)
2. Add oscillator configuration in the `Voice` constructor's `switch` block
3. Add attack/release timing in `noteOn()` and `noteOff()`
4. Update the channel indicators in the HTML controls section
5. Update `FINGER_COLORS` if you want a distinct color

To move beyond 4 modes (since there are only 4 non-thumb fingers), you'd either assign modes per-hand differently or add a mode-cycling gesture.

### Adding a new scale

Add an entry to the `SCALES` object. Values are semitone offsets from root. Include at least 2 octaves worth of notes (entries past 12 are octave+). Add a pill button in the HTML and update `setScale()`.

### Adding a new particle system

Follow the pattern: module-scoped array + MAX cap constant + `spawn*()` function + `tick*()` function called from `drawLoop()`. Place the `tick` call at the right depth in the composite layering order.

### Replacing the visual theme

The visual layer is completely decoupled from audio/gesture. You could replace the entire `drawLoop()`, all particle systems, and hand rendering without touching the audio engine. The only coupling point is `analyser` (for FFT-driven visuals) and `handResults` (for skeleton rendering).

### Self-hosting the MediaPipe model

Currently the model loads from Google's CDN on every cold start (~12MB). To self-host:

1. Download `hand_landmarker.task` from `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task`
2. Download the WASM fileset from `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm/`
3. Host both alongside `index.html`
4. Update the `FilesetResolver.forVisionTasks()` path and `modelAssetPath` to relative URLs

This eliminates external CDN dependencies and speeds up cold start, but adds ~15MB to your deploy.

---

## Gotchas and Failure Modes

**"No hand recognition"**: Almost always a model/WASM loading failure. Open DevTools Network tab — look for failed fetches to `jsdelivr` or `storage.googleapis.com`. The status bar should show which init step failed. If the model loads but hands aren't detected, check lighting (MediaPipe needs reasonable contrast) and camera resolution (lower than 480p degrades accuracy).

**AudioContext suspended**: Browsers suspend AudioContext if created without a user gesture. The overlay click handles this, but if you refactor startup, ensure `new AudioContext()` is called inside a click/touch handler. The `processFrame` loop also calls `audioCtx.resume()` as a fallback.

**`detectForVideo` timestamp collision**: Calling with the same timestamp twice throws. The `lastTimestamp` check prevents this. If you switch to a `setInterval`-based loop or Web Worker, you need your own dedup.

**Pinch jitter at threshold boundary**: The hysteresis gap (0.062 on → 0.092 off) prevents rapid toggling, but users with tremor or at extreme distances may still jitter. Widening the gap (e.g., 0.055/0.10) helps but makes pinch feel less responsive.

**Memory**: Particle arrays are bounded by hard caps, but `RIPPLES` is unbounded. In a long session with aggressive pinching, ripples array grows. Each ripple lives ~28 frames, so practical growth is limited, but if you're profiling memory, cap it.

**Safari WebGL**: MediaPipe's GPU delegate may fail on some Safari versions. It falls back to CPU, which drops frame rate. No code change needed — it's automatic — but performance will be noticeably worse.

**Module scope**: The entire app lives inside a `<script type="module">` block. Functions called from `onclick` attributes in HTML need to be attached to `window` explicitly (see `window.setScale`, `window.setRoot` at the bottom). If you add new UI controls with inline handlers, expose them the same way.

---

## Code Map

The entire app is in `index.html`. Here's the logical section layout with approximate line numbers (these shift with edits — use the section headers to orient):

| Section | What it does |
|---|---|
| `<style>` | All CSS — controls, overlays, typography, volume slider |
| `<div id="container">` | DOM structure — video, canvas, controls, legend, status |
| `import { HandLandmarker }` | ES module import from CDN |
| `AUDIO ENGINE` | AudioContext setup, reverb impulse, analyser |
| `SCALES` | Scale definitions, `xToFreq()`, rune/note mapping |
| `Voice` class | Per-finger oscillator + filter + FM + reverb send |
| `GESTURE` | Pinch detection, depth estimation, Z-axis parameter curves |
| `VISUAL ENGINE` | Canvas setup, all 6 particle systems, mandala, flame spectrum, convergence arc, hand rendering |
| `DRAW LOOP` | `drawLoop()` — composite layer ordering |
| `MEDIAPIPE` | `initMediaPipe()`, `initCamera()`, `processFrame()` |
| `STARTUP` | Click-gated init sequence |
| `UI` | `setScale()`, `setRoot()` exposed to window |

---

## Dependencies

| Dependency | Source | Version | Pinned? | Purpose |
|---|---|---|---|---|
| MediaPipe Tasks Vision | jsdelivr CDN | 0.10.18 | Yes | Hand tracking WASM + JS |
| HandLandmarker model | Google Cloud Storage | float16/latest | No (latest) | 21-point hand skeleton model |
| Google Fonts | Google CDN | — | No | Cinzel (serif headings), DM Mono (data/code) |

**Zero npm dependencies. Zero build dependencies. Zero server dependencies.**

The app will function without Google Fonts (falls back to system serif/monospace). It will not function without MediaPipe.

---

## Deployment

HTTPS required (camera). No server-side logic. Static file hosting is sufficient. See `CLAUDE.md` in the deploy package for WordPress-specific integration patterns (custom page template, subdirectory with `.htaccess` bypass, or iframe with `allow="camera"`).

---

## Design Language

The aesthetic is intentional and internally consistent. If you're extending the UI:

- **Cinzel** (serif) for ritual/title/label text — anything that names or invokes
- **DM Mono** (monospace) for data/values/status — anything that measures or reports
- **Color palette**: ember-gold (`#ffd700`, `#ffaa2a`), fire-orange (`#ff6a00`, `#ff5533`), fey-purple (`#bb66ff`), toxic-green (`#44ee88`). No blue anywhere.
- **Opacity as hierarchy**: 0.1–0.2 for ambient/background, 0.25–0.4 for secondary, 0.5+ for interactive, 1.0 only for active elements
- **Background**: `#06060b` (near-black with blue undertone), never pure black
- **Language**: "conjure" not "play", "seal" not "press", "kindle" not "start". The UI copy is part of the experience.
