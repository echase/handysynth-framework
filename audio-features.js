/**
 * audio-features v0.1.0 — AnalyserNode → per-frame musical feature object.
 *
 * Input-agnostic within Web Audio: the host owns the AudioContext, source,
 * and AnalyserNode; this module only reads magnitudes and returns numbers.
 * It never touches lumini or the DOM. Consumers: tuneflow v0.1b (first).
 *
 * Single-file variants inline a pinned copy (ADR 009): record the pin in the
 * variant changelog heading, e.g. `(audio-features v0.1.0)`.
 *
 * All outputs are normalized 0–1 relative values (slow peak normalizer) —
 * research rule: relative over absolute. See spec 2026-07-10-tuneflow-design.
 */

export const AUDIO_FEATURES_VERSION = '0.1.0';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Log-spaced band bin ranges over [minHz, maxHz]. Contiguous, inclusive.
export function bandEdges(numBands, minHz, maxHz, sampleRate, fftSize) {
  const hzPerBin = sampleRate / fftSize;
  const edges = [];
  let prevHi = Math.max(1, Math.round(minHz / hzPerBin)) - 1;
  for (let b = 1; b <= numBands; b++) {
    const hz = minHz * Math.pow(maxHz / minHz, b / numBands);
    let hi = Math.round(hz / hzPerBin);
    if (hi <= prevHi) hi = prevHi + 1; // every band ≥ 1 bin
    edges.push([prevHi + 1, hi]);
    prevHi = hi;
  }
  return edges;
}

// Mean byte magnitude per band, scaled to 0–1.
export function bandEnergies(mag, edges) {
  const out = new Float32Array(edges.length);
  for (let b = 0; b < edges.length; b++) {
    const [lo, hi] = edges[b];
    let sum = 0;
    for (let i = lo; i <= hi; i++) sum += mag[i];
    out[b] = sum / ((hi - lo + 1) * 255);
  }
  return out;
}

// Per-band spectral flux (positive increases only) against an adaptive
// running-mean threshold. Onsets are events: never smoothed downstream (R2).
export class OnsetDetector {
  constructor(numBands, { k = 2.2, floor = 0.06, refractoryMs = 80, meanCoef = 0.05 } = {}) {
    this.k = k; this.floor = floor; this.refractoryMs = refractoryMs; this.meanCoef = meanCoef;
    this.prev = null;
    this.meanFlux = new Float32Array(numBands);
    this.lastFire = new Float32Array(numBands).fill(-1e9);
    this.numBands = numBands;
  }
  detect(mag, edges, nowMs) {
    const out = [];
    const first = this.prev === null;
    if (first) this.prev = new Uint8Array(mag.length);
    for (let b = 0; b < this.numBands; b++) {
      const [lo, hi] = edges[b];
      let flux = 0;
      for (let i = lo; i <= hi; i++) {
        const d = mag[i] - this.prev[i];
        if (d > 0) flux += d;
      }
      flux /= (hi - lo + 1) * 255; // 0–1 per band
      const threshold = this.k * this.meanFlux[b] + this.floor;
      const canFire = !first && (nowMs - this.lastFire[b]) >= this.refractoryMs;
      const fired = canFire && flux > threshold;
      if (fired) this.lastFire[b] = nowMs;
      this.meanFlux[b] += (flux - this.meanFlux[b]) * this.meanCoef;
      out.push({ fired, strength: fired ? clamp01((flux - threshold) / (1 - threshold || 1)) : 0 });
    }
    this.prev.set(mag);
    return out;
  }
}

// Slow AGC replacement: mic setups differ wildly in level; mappings must see
// relative values. Peak rises instantly, decays with ~10s half-life.
export class PeakNormalizer {
  constructor({ halfLifeS = 10, floor = 0.02 } = {}) {
    this.halfLifeS = halfLifeS; this.floor = floor; this.peak = floor;
  }
  normalize(v, dt) {
    if (v > this.peak) this.peak = v;
    else this.peak = Math.max(this.floor, this.peak * Math.pow(0.5, dt / this.halfLifeS));
    return clamp01(v / this.peak);
  }
}

// Slow tier (2–5 s): steers ONLY palette drift, so a crude estimate is fine
// by design (spec §1). Not a beat tracker — separates ballad from banger.
export class SlowTier {
  constructor({ maxIois = 24 } = {}) {
    this.maxIois = maxIois;
    this.lastOnsetMs = null;
    this.iois = []; // seconds
    this.loudAvg = 0; this.centroidAvg = 0.5;
    this.tempo = 0; this.arousal = 0; this.valence = 0.5;
  }
  onOnset(nowMs) {
    if (this.lastOnsetMs !== null) {
      const ioi = (nowMs - this.lastOnsetMs) / 1000;
      if (ioi >= 0.25 && ioi <= 2.0) {
        this.iois.push(ioi);
        if (this.iois.length > this.maxIois) this.iois.shift();
      }
    }
    this.lastOnsetMs = nowMs;
  }
  _tempoEstimate() {
    if (this.iois.length < 8) return 0;
    const bins = new Map(); // 20 ms bins → mode
    for (const ioi of this.iois) {
      const key = Math.round(ioi * 50);
      bins.set(key, (bins.get(key) || 0) + 1);
    }
    let bestKey = 0, bestN = 0;
    for (const [key, n] of bins) if (n > bestN) { bestN = n; bestKey = key; }
    return 60 / (bestKey / 50);
  }
  _regularity() {
    if (this.iois.length < 8) return 0;
    const s = [...this.iois].sort((a, b) => a - b);
    const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
    const median = q(0.5) || 1e-6;
    return 1 - clamp01((q(0.75) - q(0.25)) / median);
  }
  update(loud, centroid, dt) {
    const cAvg = dt / 3, cOut = dt / 5; // ~3 s inputs, ~5 s outputs
    this.loudAvg += (clamp01(loud) - this.loudAvg) * cAvg;
    this.centroidAvg += (clamp01(centroid) - this.centroidAvg) * cAvg;
    const bpm = this._tempoEstimate();
    const normTempo = clamp01((bpm - 60) / 120);
    const arousalTarget = clamp01(0.6 * normTempo + 0.4 * this.loudAvg);
    const valenceTarget = clamp01(0.65 * this.centroidAvg + 0.35 * this._regularity());
    this.tempo += (bpm - this.tempo) * cOut;
    this.arousal += (arousalTarget - this.arousal) * cOut;
    this.valence += (valenceTarget - this.valence) * cOut;
    return { tempo: this.tempo, arousal: this.arousal, valence: this.valence };
  }
}
