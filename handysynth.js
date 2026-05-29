/**
 * HandySynth Core Platform v1.1
 *
 * Reusable hand-tracking → gesture → audio/visual pipeline.
 * Variants implement the callback interface to build instruments.
 *
 * Usage:
 *   import { HandySynth } from './handysynth.js';
 *   const hs = new HandySynth({ variant, options });
 *   hs.mount(containerEl);
 */

import { HandLandmarker, FilesetResolver }
  from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs";

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const FINGER_TIPS  = [8, 12, 16, 20]; // index, middle, ring, pinky
export const THUMB_TIP    = 4;
export const FINGER_NAMES = ['index', 'middle', 'ring', 'pinky'];

export const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

export const NOTE_NAMES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];

export function freqToNote(f) {
  const m = Math.round(12 * Math.log2(f / 440) + 69);
  return NOTE_NAMES[((m % 12) + 12) % 12];
}

export function freqToMidi(f) {
  return Math.round(12 * Math.log2(f / 440) + 69);
}

// ═══════════════════════════════════════════════════════════════
//  SCALES (shared library — variants can add their own)
// ═══════════════════════════════════════════════════════════════

export const SCALES = {
  // Pentatonic modes
  pentatonic:  [0,2,4,7,9, 12,14,16,19,21, 24],
  minor_pent:  [0,3,5,7,10, 12,15,17,19,22, 24],

  // Diatonic modes
  major:       [0,2,4,5,7,9,11, 12,14,16,17,19,21,23],
  minor:       [0,2,3,5,7,8,10, 12,14,15,17,19,20,22],
  dorian:      [0,2,3,5,7,9,10, 12,14,15,17,19,21,22],
  phrygian:    [0,1,3,5,7,8,10, 12,13,15,17,19,20,22],
  lydian:      [0,2,4,6,7,9,11, 12,14,16,18,19,21,23],
  mixolydian:  [0,2,4,5,7,9,10, 12,14,16,17,19,21,22],

  // Harmonic / melodic
  harm_minor:  [0,2,3,5,7,8,11, 12,14,15,17,19,20,23],
  mel_minor:   [0,2,3,5,7,9,11, 12,14,15,17,19,21,23],

  // World / exotic
  in_sen:      [0,1,5,7,10, 12,13,17,19,22, 24],
  hirajoshi:   [0,2,3,7,8,  12,14,15,19,20, 24],
  hungarian:   [0,2,3,6,7,8,11, 12,14,15,18,19,20,23],
  whole_tone:  [0,2,4,6,8,10, 12,14,16,18,20,22],
  chromatic:   [0,1,2,3,4,5,6,7,8,9,10,11, 12,13,14],
};

// ═══════════════════════════════════════════════════════════════
//  DEPTH ESTIMATION
// ═══════════════════════════════════════════════════════════════

/**
 * Estimate hand depth (0–1) from landmarks.
 * Blends palm span (70%) with fingertip Z average (30%).
 * Power curve (^0.55) compresses range for responsiveness.
 *
 * @param {Array} lms — 21-point landmark array
 * @param {Object} opts — { spanWeight, zWeight, curve }
 */
export function estimateDepth(lms, opts = {}) {
  const { spanWeight = 0.7, zWeight = 0.3, curve = 0.55 } = opts;

  const span = Math.abs(lms[0].y - lms[9].y);
  const rawScale = Math.min(1, Math.max(0, (span - 0.03) / 0.25));

  let zSum = 0;
  FINGER_TIPS.forEach(idx => { zSum += Math.abs(lms[idx].z || 0); });
  const zFactor = Math.min(1, (zSum / FINGER_TIPS.length) / 0.15);

  const blended = rawScale * spanWeight + zFactor * zWeight;
  return Math.pow(Math.min(1, Math.max(0, blended)), curve);
}

// ═══════════════════════════════════════════════════════════════
//  PITCH MAPPING
// ═══════════════════════════════════════════════════════════════

/**
 * Map a normalized X position (0–1) to a frequency.
 *
 * @param {number} normX   — 0=low, 1=high
 * @param {Array}  scale   — semitone offset array from SCALES
 * @param {number} rootHz  — root frequency in Hz
 * @param {number} octaveShift — additional octave offset
 */
export function xToFreq(normX, scale, rootHz, octaveShift = 0) {
  const idx = Math.floor(normX * (scale.length - 1));
  const st  = scale[Math.max(0, Math.min(idx, scale.length - 1))];
  return rootHz * Math.pow(2, (st + octaveShift * 12) / 12);
}

// ═══════════════════════════════════════════════════════════════
//  PINCH DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Euclidean distance between thumb tip and a fingertip,
 * including Z axis, in normalized landmark space.
 */
export function pinchDistance(lms, tipIdx) {
  const a = lms[THUMB_TIP], b = lms[tipIdx];
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

// ═══════════════════════════════════════════════════════════════
//  HANDYSYNTH CLASS
// ═══════════════════════════════════════════════════════════════

/**
 * @typedef {Object} HandySynthVariant
 * @property {function} onInit       — called with { audioCtx, analyser, masterGain, canvas, ctx, W, H }
 * @property {function} onNoteOn     — called with { hand, finger, fingerName, freq, vol, depth, cx, cy }
 * @property {function} onNoteUpdate — called with { hand, finger, fingerName, freq, vol, depth, cx, cy }
 * @property {function} onNoteOff    — called with { hand, finger, fingerName, cx, cy }
 * @property {function} onFrame      — called with { hands, pinchState, canvas, ctx, W, H, audioCtx, analyser, masterGain, dt }
 * @property {function} [onResize]   — called with { W, H }
 * @property {function} [onDestroy]  — cleanup
 */

export class HandySynth {
  /**
   * @param {Object} config
   * @param {HandySynthVariant} config.variant — the instrument implementation
   * @param {Object} [config.options]
   * @param {number} [config.options.pinchOn=0.062]     — pinch-on distance threshold
   * @param {number} [config.options.pinchOff=0.092]    — pinch-off distance threshold
   * @param {string} [config.options.defaultScale='pentatonic']
   * @param {number} [config.options.rootFreq=130.81]   — root note in Hz
   * @param {boolean}[config.options.reversePitch=true]  — right=high, left=low
   * @param {number} [config.options.leftOctaveShift=0] — octave offset for left hand
   * @param {number} [config.options.rightOctaveShift=1] — octave offset for right hand
   * @param {number} [config.options.masterVolume=0.7]
   * @param {number} [config.options.numHands=2]
   */
  constructor({ variant, options = {} }) {
    this.variant = variant;
    this.opts = {
      pinchOn:          options.pinchOn          ?? 0.062,
      pinchOff:         options.pinchOff         ?? 0.092,
      defaultScale:     options.defaultScale     ?? 'pentatonic',
      rootFreq:         options.rootFreq         ?? 130.81,
      reversePitch:     options.reversePitch     ?? true,
      leftOctaveShift:  options.leftOctaveShift  ?? 0,
      rightOctaveShift: options.rightOctaveShift ?? 1,
      masterVolume:     options.masterVolume     ?? 0.7,
      numHands:         options.numHands         ?? 2,
    };

    // Mutable state
    this.currentScale = SCALES[this.opts.defaultScale] || SCALES.pentatonic;
    this.currentScaleName = this.opts.defaultScale;
    this.rootFreq = this.opts.rootFreq;

    // Internals (initialized on mount)
    this._audioCtx    = null;
    this._masterGain  = null;
    this._analyser    = null;
    this._canvas      = null;
    this._ctx         = null;
    this._videoEl     = null;
    this._handLandmarker = null;
    this._lastTimestamp  = 0;
    this._running     = false;

    // Per-finger pinch state: { "Left_0": false, "Right_2": true, ... }
    this.pinchState = {};
    this._initPinchState();
  }

  _initPinchState() {
    ['Left', 'Right'].forEach(h => {
      FINGER_TIPS.forEach((_, fi) => {
        this.pinchState[`${h}_${fi}`] = false;
      });
    });
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Set scale by name (from SCALES) or provide a custom semitone array.
   */
  setScale(nameOrArray) {
    if (typeof nameOrArray === 'string') {
      this.currentScale = SCALES[nameOrArray] || this.currentScale;
      this.currentScaleName = nameOrArray;
    } else if (Array.isArray(nameOrArray)) {
      this.currentScale = nameOrArray;
      this.currentScaleName = 'custom';
    }
  }

  setRoot(hz) {
    this.rootFreq = hz;
  }

  setVolume(v) {
    if (this._masterGain && this._audioCtx) {
      this._masterGain.gain.setTargetAtTime(v, this._audioCtx.currentTime, 0.05);
    }
  }

  /** Read-only access */
  get audioCtx()   { return this._audioCtx; }
  get masterGain() { return this._masterGain; }
  get analyser()   { return this._analyser; }
  get canvas()     { return this._canvas; }
  get ctx()        { return this._ctx; }

  // ── Mount / Unmount ──────────────────────────────────────────

  /**
   * Mount into a container element. Creates video + canvas,
   * wires up a click-to-start overlay.
   *
   * @param {HTMLElement} container — must have position:relative and sized
   * @param {Object} domRefs — optional: { statusEl, overlayEl, videoEl, canvasEl }
   *   If provided, uses existing DOM elements instead of creating new ones.
   */
  mount(container, domRefs = {}) {
    this._container = container;

    // Video element (hidden, feeds MediaPipe)
    this._videoEl = domRefs.videoEl || document.createElement('video');
    this._videoEl.autoplay = true;
    this._videoEl.playsInline = true;
    this._videoEl.muted = true;
    this._videoEl.style.cssText = 'position:absolute;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);opacity:0;pointer-events:none;';
    if (!domRefs.videoEl) container.appendChild(this._videoEl);

    // Canvas
    this._canvas = domRefs.canvasEl || document.createElement('canvas');
    this._canvas.style.cssText = 'position:absolute;width:100%;height:100%;';
    if (!domRefs.canvasEl) container.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');

    // Status element
    this._statusEl = domRefs.statusEl || null;

    // Overlay — if provided externally, attach gesture listeners.
    // touchend + pointerup capture mobile taps reliably on iOS Safari.
    // The _startCalled guard prevents double-fire when all three events land.
    const overlayEl = domRefs.overlayEl;
    if (overlayEl) {
      overlayEl.addEventListener('touchend', (e) => { e.preventDefault(); this._start(overlayEl); }, { once: true, passive: false });
      overlayEl.addEventListener('pointerup', () => this._start(overlayEl), { once: true });
      overlayEl.addEventListener('click',    () => this._start(overlayEl), { once: true });
    }

    // Resize
    this._onResize = () => this._handleResize();
    window.addEventListener('resize', this._onResize);
    this._handleResize();
  }

  destroy() {
    this._running = false;
    window.removeEventListener('resize', this._onResize);
    if (this._audioCtx) this._audioCtx.close();
    if (this.variant.onDestroy) this.variant.onDestroy();
  }

  // ── Internal startup ─────────────────────────────────────────

  async _start(overlayEl) {
    if (this._startCalled) return;
    this._startCalled = true;
    if (overlayEl) overlayEl.classList.add('hidden');

    // 1. Audio — must await so iOS Safari fully unlocks WebAudio
    this._setStatus('Igniting audio…');
    await this._initAudio();

    if (this._audioCtx.state !== 'running') {
      this._setStatus('Audio blocked — tap again or check silent mode');
      this._startCalled = false;
      if (overlayEl) overlayEl.classList.remove('hidden');
      return;
    }

    // 2. Notify variant
    const W = this._canvas.width, H = this._canvas.height;
    this.variant.onInit({
      audioCtx:   this._audioCtx,
      analyser:   this._analyser,
      masterGain: this._masterGain,
      canvas:     this._canvas,
      ctx:        this._ctx,
      W, H,
    });

    // 3. MediaPipe
    const modelOk = await this._initMediaPipe();
    if (!modelOk) return;

    // 4. Camera
    const camOk = await this._initCamera();
    if (!camOk) return;

    // 5. Go
    this._running = true;
    this._setStatus('Raise your hands');
    this._drawLoop();
    this._processFrame();
  }

  async _initAudio() {
    this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    this._masterGain = this._audioCtx.createGain();
    this._masterGain.gain.value = this.opts.masterVolume;

    this._analyser = this._audioCtx.createAnalyser();
    this._analyser.fftSize = 512;
    this._analyser.smoothingTimeConstant = 0.82;

    this._masterGain.connect(this._analyser);
    this._analyser.connect(this._audioCtx.destination);

    // iOS Safari requires an explicit resume() during the trusted user gesture.
    // Calling it here (inside _start, which is called from the overlay tap)
    // is the only reliable way to unlock WebAudio on iPhone/iPad.
    if (this._audioCtx.state !== 'running') {
      await this._audioCtx.resume();
    }

    // Silent warm-up buffer — fully unlocks the audio graph on iOS
    const buf = this._audioCtx.createBuffer(1, 1, this._audioCtx.sampleRate);
    const src = this._audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(this._audioCtx.destination);
    src.start(0);
  }

  async _initMediaPipe() {
    this._setStatus('Loading vision model…');
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
      );
      this._setStatus('Building hand landmarker…');
      this._handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: this.opts.numHands,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      this._setStatus('Hand landmarker ready');
      return true;
    } catch (err) {
      this._setStatus(`Model load failed: ${err.message}`);
      console.error('HandySynth MediaPipe error:', err);
      return false;
    }
  }

  async _initCamera() {
    this._setStatus('Requesting camera…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      this._videoEl.srcObject = stream;
      await new Promise((resolve, reject) => {
        this._videoEl.onloadedmetadata = () => this._videoEl.play().then(resolve).catch(reject);
        this._videoEl.onerror = reject;
      });
      this._setStatus('Camera active');
      return true;
    } catch (err) {
      this._setStatus(`Camera error: ${err.message}`);
      console.error('HandySynth camera error:', err);
      return false;
    }
  }

  _handleResize() {
    if (!this._canvas) return;
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
    if (this.variant.onResize) {
      this.variant.onResize({ W: this._canvas.width, H: this._canvas.height });
    }
  }

  _setStatus(msg) {
    if (this._statusEl) this._statusEl.textContent = msg;
  }

  // ── Frame loops ──────────────────────────────────────────────

  _drawLoop() {
    if (!this._running) return;
    requestAnimationFrame(() => this._drawLoop());

    const W = this._canvas.width, H = this._canvas.height;

    this.variant.onFrame({
      hands:      this._currentHands,
      pinchState: this.pinchState,
      canvas:     this._canvas,
      ctx:        this._ctx,
      W, H,
      audioCtx:   this._audioCtx,
      analyser:   this._analyser,
      masterGain: this._masterGain,
      dt:         1 / 60,  // approximate
    });
  }

  _currentHands = null;

  _processFrame() {
    if (!this._running) return;
    requestAnimationFrame(() => this._processFrame());

    if (!this._handLandmarker || this._videoEl.readyState < 2) return;

    const now = performance.now();
    if (now === this._lastTimestamp) return;
    this._lastTimestamp = now;

    let results;
    try {
      results = this._handLandmarker.detectForVideo(this._videoEl, now);
    } catch (e) {
      return;
    }

    // Audio unlock is handled in _initAudio() during the user gesture. Do not resume here (iOS).

    // Normalize
    const hands = [];
    if (results.landmarks && results.landmarks.length > 0) {
      for (let hi = 0; hi < results.landmarks.length; hi++) {
        const lms = results.landmarks[hi];
        const label = results.handednesses[hi]?.[0]?.categoryName || 'Right';
        const depth = estimateDepth(lms);
        hands.push({ landmarks: lms, label, depth });
      }
    }
    this._currentHands = hands.length > 0 ? hands : null;

    // Gesture processing
    const W = this._canvas.width, H = this._canvas.height;
    const activeKeys = new Set();

    if (this._currentHands) {
      this._currentHands.forEach(hand => {
        const lms   = hand.landmarks;
        const label = hand.label;
        const isLeft = label === 'Left';
        const depth  = hand.depth;

        FINGER_TIPS.forEach((tipIdx, fi) => {
          const key  = `${label}_${fi}`;
          const dist = pinchDistance(lms, tipIdx);
          const tip  = lms[tipIdx];

          // Pitch mapping
          const rawX = this.opts.reversePitch ? (1 - tip.x) : tip.x;
          const octShift = isLeft ? this.opts.leftOctaveShift : this.opts.rightOctaveShift;
          const freq = xToFreq(rawX, this.currentScale, this.rootFreq, octShift);
          const vol  = Math.max(0.05, Math.min(1, (1 - tip.y) * 1.3));

          // Canvas coordinates (mirrored)
          const cx = (1 - tip.x) * W;
          const cy = tip.y * H;

          const wasOn  = this.pinchState[key];
          const thresh = wasOn ? this.opts.pinchOff : this.opts.pinchOn;

          const payload = {
            hand: label, finger: fi, fingerName: FINGER_NAMES[fi],
            freq, vol, depth, cx, cy,
          };

          if (dist < thresh) {
            activeKeys.add(key);
            if (!wasOn) {
              this.pinchState[key] = true;
              this.variant.onNoteOn(payload);
            } else {
              this.variant.onNoteUpdate(payload);
            }
          } else {
            if (wasOn) {
              this.pinchState[key] = false;
              this.variant.onNoteOff(payload);
            }
          }
        });
      });
    }

    // Release vanished hands
    Object.keys(this.pinchState).forEach(k => {
      if (this.pinchState[k] && !activeKeys.has(k)) {
        this.pinchState[k] = false;
        const [hand, fi] = k.split('_');
        this.variant.onNoteOff({
          hand, finger: parseInt(fi), fingerName: FINGER_NAMES[parseInt(fi)],
          freq: 0, vol: 0, depth: 0, cx: 0, cy: 0,
        });
      }
    });

    // Status
    const n = this._currentHands ? this._currentHands.length : 0;
    this._setStatus(
      n ? `${n} hand${n > 1 ? 's' : ''} detected` : 'Raise your hands'
    );
  }
}
