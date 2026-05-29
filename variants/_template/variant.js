/**
 * [VARIANT NAME] — HandySynth Variant Template
 *
 * Copy this file and index-template.html to a new folder under variants/
 * to start a new instrument. Implement the callback hooks below.
 *
 * The core platform handles:
 *   ✓ Camera + MediaPipe hand tracking
 *   ✓ Pinch gesture detection with hysteresis
 *   ✓ Depth estimation (Z-axis)
 *   ✓ Pitch quantization to scale
 *   ✓ XYZ → freq/vol/depth mapping
 *   ✓ Startup orchestration (overlay → audio → model → camera → loops)
 *
 * You implement:
 *   → Audio engine (what sounds does it make?)
 *   → Visual theme (what does it look like?)
 *   → Any variant-specific gesture interpretation
 */

import {
  FINGER_TIPS, THUMB_TIP, FINGER_NAMES,
  HAND_CONNECTIONS, freqToNote, estimateDepth
} from '../../handysynth.js';

export function createVariant() {
  // ── State initialized in onInit ──
  let audioCtx, analyser, masterGain;

  return {
    /**
     * Called once after AudioContext is created.
     * Build your audio graph here.
     *
     * @param {AudioContext} audioCtx
     * @param {AnalyserNode} analyser — connected: masterGain → analyser → destination
     * @param {GainNode} masterGain — your audio should connect here
     * @param {HTMLCanvasElement} canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} W — canvas width
     * @param {number} H — canvas height
     */
    onInit({ audioCtx: ctx, analyser: an, masterGain: mg, canvas, ctx: c2d, W, H }) {
      audioCtx   = ctx;
      analyser   = an;
      masterGain = mg;

      // TODO: Build oscillators, filters, effects, etc.
      // Connect your audio to masterGain.
    },

    /**
     * Called when a finger pinches the thumb (note begins).
     *
     * @param {string} hand       — 'Left' or 'Right'
     * @param {number} finger     — 0-3 (index, middle, ring, pinky)
     * @param {string} fingerName — 'index', 'middle', 'ring', 'pinky'
     * @param {number} freq       — pitch in Hz, quantized to current scale
     * @param {number} vol        — 0–1, derived from Y position
     * @param {number} depth      — 0–1, Z-axis depth estimate
     * @param {number} cx         — canvas X (mirrored)
     * @param {number} cy         — canvas Y
     */
    onNoteOn({ hand, finger, fingerName, freq, vol, depth, cx, cy }) {
      // TODO: Start a sound
    },

    /**
     * Called every frame while a finger is held in pinch.
     * Same payload shape as onNoteOn.
     */
    onNoteUpdate({ hand, finger, fingerName, freq, vol, depth, cx, cy }) {
      // TODO: Modulate the sound (pitch glide, filter sweep, etc.)
    },

    /**
     * Called when a finger releases from pinch.
     */
    onNoteOff({ hand, finger, fingerName, cx, cy }) {
      // TODO: Stop or release the sound
    },

    /**
     * Called every animation frame. Draw your visuals here.
     *
     * @param {Array|null} hands      — array of { landmarks, label, depth } or null
     * @param {Object}     pinchState — { "Left_0": true, "Right_2": false, ... }
     * @param {HTMLCanvasElement} canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} W, H
     * @param {AudioContext} audioCtx
     * @param {AnalyserNode} analyser
     * @param {GainNode} masterGain
     */
    onFrame({ hands, pinchState, canvas, ctx, W, H, audioCtx, analyser }) {
      // Clear
      ctx.clearRect(0, 0, W, H);

      // TODO: Draw your visual theme

      // Tip: use analyser.getByteFrequencyData() for audio-reactive visuals
      // Tip: iterate hands[] for skeleton rendering
      // Tip: check pinchState["Right_0"] for per-finger active state
    },

    /**
     * Optional: called on window resize.
     */
    onResize({ W, H }) {
      // TODO: Recalculate layout if needed
    },
  };
}
