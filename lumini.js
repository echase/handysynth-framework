// handysynth-foundation/lumini.js
/**
 * Lumini v0.1.0 — bare-bones WebGL fluid feedback layer for HandySynth.
 *
 * Input-agnostic: any driver (MediaPipe hand/head, mouse, program code) calls
 *   lum.splat(x, y, dx, dy, color)   // screen-space, top-left, y DOWN
 * Recipes (R1 wake trails, R2 pluck bursts, R3 sustain bleed, R5 loudness
 * turbulence, R16 idle breathing) are host-side choreography documented in the
 * Lumini Recipe Book; R16 is internal. See spec 2026-07-07.
 *
 * Single-file variants inline a pinned copy (ADR 009): record the pin in the
 * variant changelog heading, e.g. `(lumini v0.1.0)`.
 *
 * Fluid core: Pavel Dobryakov's WebGL-Fluid-Simulation (MIT), lifted from
 * Lumora v0.35b. MacCormack advection dropped in v1.
 */

export const LUMINI_VERSION = '0.1.0';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export class OneEuro {
  constructor(mincutoff = 1.0, beta = 0.007, dcutoff = 1.0) {
    this.mincutoff = mincutoff; this.beta = beta; this.dcutoff = dcutoff;
    this.xPrev = null; this.dxPrev = 0; this.started = false;
  }
  _alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }
  filter(x, dt) {
    if (!this.started) { this.started = true; this.xPrev = x; this.dxPrev = 0; return x; }
    const dx = (x - this.xPrev) / dt;
    const aD = this._alpha(this.dcutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    const cutoff = this.mincutoff + this.beta * Math.abs(dxHat);
    const a = this._alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat; this.dxPrev = dxHat;
    return xHat;
  }
  reset() { this.started = false; }
}

// Ember base hue (indigo-violet) ramping to hot near-white.
export function heatColor(t) {
  const u = clamp01(t);
  return {
    r: 0.10 + 0.85 * u,
    g: 0.04 + 0.70 * u * u,
    b: 0.22 + 0.65 * u,
  };
}

export function smoothEnergy(prev, target, coef) {
  return clamp01(prev + (target - prev) * coef);
}

export function screenToGL(x, y, dx, dy) {
  return { x, y: 1 - y, dx, dy: -dy };
}

export const PRESETS = {
  classic: Object.freeze({
    SIM_RESOLUTION: 128, DYE_RESOLUTION: 1024,
    DENSITY_DISSIPATION: 1.0, VELOCITY_DISSIPATION: 0.25,
    PRESSURE: 0.8, PRESSURE_ITERATIONS: 20, CURL: 30,
    SPLAT_RADIUS: 0.20, SPLAT_FORCE: 6000,
    BLOOM: true, BLOOM_ITERATIONS: 8, BLOOM_INTENSITY: 0.8, BLOOM_THRESHOLD: 0.6,
    SUNRAYS: false,
  }),
  ember: Object.freeze({
    SIM_RESOLUTION: 64, DYE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 1.4, VELOCITY_DISSIPATION: 0.4,
    PRESSURE: 0.8, PRESSURE_ITERATIONS: 12, CURL: 18,
    SPLAT_RADIUS: 0.25, SPLAT_FORCE: 6000,
    BLOOM: false, BLOOM_ITERATIONS: 8, BLOOM_INTENSITY: 0.8, BLOOM_THRESHOLD: 0.6,
    SUNRAYS: false,
  }),
};
