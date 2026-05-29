Here’s the handoff for Codex / Claude Code:

~~~md
# Handoff: Fix iPhone Safari Audio in HandySynth DrumSpace

## Context

Single-file vanilla HTML app:

`https://everittchase.com/handysynth/drumspace/`

The app uses:

- MediaPipe HandLandmarker
- iPhone camera
- Web Audio API synthesized drum voices
- Pinch gestures to trigger sounds

The app renders/tracks hands, but produces no sound on iPhone Safari.

## Diagnosis

The app creates `AudioContext` inside the overlay click handler, but it does not explicitly unlock audio during the trusted user gesture.

Current flow:

```js
overlay.addEventListener('click', start, { once: true });

async function start() {
  overlay.classList.add('hidden');
  setStatus('Starting audio…');
  initAudio();
  ...
}
~~~

`initAudio()` creates the `AudioContext`, but does not `await audioCtx.resume()` or play a silent buffer.

Later, `processFrame()` tries:

```js
if (audioCtx?.state === 'suspended') audioCtx.resume();
```

That is too late for iOS Safari because it happens inside `requestAnimationFrame` / camera-processing logic, not inside a direct user gesture.

Browsers commonly block Web Audio until audio is created/resumed after a user gesture; MDN documents autoplay blocking for Web Audio, and Chrome/WebRTC guidance gives the same practical recommendation.  

## **Goal**

Make audio reliably start on iPhone Safari by unlocking Web Audio inside the initial overlay tap/touch.

## **Required Patch**

### **1. Make** **`initAudio()`** **async**

Replace current `initAudio()` with:

```js
async function initAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContextClass();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.8;

  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.knee.value = 5;
  comp.ratio.value = 4;
  comp.attack.value = 0.002;
  comp.release.value = 0.08;

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.7;

  masterGain.connect(comp);
  comp.connect(analyser);
  analyser.connect(audioCtx.destination);

  initNoise(audioCtx);

  // iOS Safari unlock: must happen during trusted user gesture
  if (audioCtx.state !== 'running') {
    await audioCtx.resume();
  }

  // Silent warm-up buffer
  const buffer = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);
}
```

### **2. Add start guard and await audio init**

Replace current `start()` with:

```js
let started = false;

async function start(e) {
  if (e) e.preventDefault();
  if (started) return;
  started = true;

  overlay.classList.add('hidden');
  setStatus('Starting audio…');

  await initAudio();

  if (audioCtx.state !== 'running') {
    setStatus('Audio blocked — tap again or check iPhone silent mode');
    started = false;
    overlay.classList.remove('hidden');
    return;
  }

  updateSlotUI();

  if (!await initMediaPipe()) return;
  if (!await initCamera()) return;

  running = true;
  drawLoop();
  processFrame();
}
```

### **3. Use mobile-friendly gesture events**

Replace:

```js
overlay.addEventListener('click', start, { once: true });
```

with:

```js
overlay.addEventListener('touchend', start, { once: true, passive: false });
overlay.addEventListener('pointerup', start, { once: true });
overlay.addEventListener('click', start, { once: true });
```

The `started` guard prevents double-start.

### **4. Remove misleading resume in frame loop**

Replace this in `processFrame()`:

```js
if (audioCtx?.state === 'suspended') audioCtx.resume();
```

with:

```js
// Do not rely on resume here for iOS.
// Audio must be unlocked during the initial user gesture.
```



## **Constraints**

Do not rewrite the app.
 Do not replace MediaPipe.
 Do not add dependencies.
 Do not split the single-file app unless explicitly asked.
 Keep this as a minimal surgical fix.

