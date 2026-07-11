// handysynth-foundation/effort-curves.js
/**
 * EffortCurves — landmark-agnostic motion features over named tracked points.
 *
 * The embodied-musicality layer: converts point trajectories into effort
 * signals (energy, smoothness, stillness, onsets) per the 2026-06-11 body-
 * motion handoff. Skeleton geometry (expansion, height, lean) is deliberately
 * NOT here — it is anatomy-specific and lives variant-side. This module works
 * identically on hand landmarks, pose landmarks, or synthetic points, so hand
 * variants can adopt it unchanged (concerns/CANDIDATES.md).
 *
 * Single-file variants inline a pinned copy (ADR 009): record the pin in the
 * variant changelog heading, e.g. `(effort-curves v0.1.0)`.
 *
 * Usage:
 *   const ec = new EffortCurves(['lwrist', 'rwrist'], { onsetJerk: 0.012 });
 *   const f = ec.feed({ lwrist: {x, y, visible}, ... }, performance.now());
 *   // f = { points: {name: {speed, vx, vy}}, energy, smoothness,
 *   //       stillness, onsets: [{point, mag}] }
 */
export const EFFORT_CURVES_VERSION = '0.2.1';

const DEFAULTS = {
  emaSpeed:    0.3,    // per-point speed EMA factor
  emaEnergy:   0.15,   // aggregate energy EMA factor
  energyScale: 18,     // speed (screen-fractions/frame) → 0..1 energy
  stillThresh: 0.015,  // aggregate energy below this counts as still
  stillRampMs: 1500,   // time at sub-threshold energy to reach stillness=1
  onsetJerk:   0.05,   // per-frame speed delta that fires an onset
  onsetCooldownMs: 180, // per-point refractory period
};

export class EffortCurves {
  constructor(pointNames, opts = {}) {
    this.o = { ...DEFAULTS, ...opts };
    this.pts = new Map(pointNames.map(n => [n, {
      x: 0, y: 0, vx: 0, vy: 0, speed: 0, prevSpeed: 0,
      seen: false, lastOnset: -Infinity,
    }]));
    this.energy = 0;
    this.smoothness = 1;
    this.stillness = 0;
    this._stillSince = null;
    this._lastNow = null;
    this._lastOutput = null;
  }

  feed(points, now) {
    // Per-frame model, intentionally NOT time-normalized: vx/vy/speed are raw
    // position deltas per feed() call, assuming a fixed-cadence tracking loop.
    // dt is reserved for a future time-normalized mode and unused today.
    //
    // Guard against a backwards/reset `now` (callers restarting their
    // timestamp origin, or a jittery clock source): `now` is also used as an
    // absolute reference for `_stillSince` and per-point `lastOnset`, so a
    // regression there would otherwise produce a negative stillness delta and
    // spuriously suppress onsets until the clock "catches back up". Resync
    // and hold the previous output for that one frame instead of integrating.
    if (this._lastNow !== null) {
      const dtRaw = now - this._lastNow;
      if (!Number.isFinite(dtRaw) || dtRaw <= 0) {
        this._lastNow = now;
        this._stillSince = null;
        for (const s of this.pts.values()) s.lastOnset = -Infinity;
        return this._lastOutput || { points: {}, energy: this.energy,
          smoothness: this.smoothness, stillness: this.stillness, onsets: [] };
      }
    }
    this._lastNow = now;
    const onsets = [];
    let speedSum = 0, jerkSum = 0, n = 0;

    for (const [name, s] of this.pts) {
      const p = points[name];
      if (!p || p.visible === false || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        // Coast: hold position, bleed speed, re-arm cleanly on reappear.
        // A non-finite coordinate is treated the same as invisible so it
        // never enters the smoothing state (NaN would otherwise poison
        // `speed`/`energy` permanently via the EMA).
        s.speed *= 0.8; s.seen = false;
        continue;
      }
      if (!s.seen) {            // (re)acquire without a phantom velocity spike
        s.x = p.x; s.y = p.y; s.vx = 0; s.vy = 0;
        s.speed = 0; s.prevSpeed = 0; s.seen = true;
        continue;
      }
      s.vx = p.x - s.x; s.vy = p.y - s.y;
      s.x = p.x; s.y = p.y;
      const raw = Math.hypot(s.vx, s.vy);
      s.prevSpeed = s.speed;
      s.speed += (raw - s.speed) * this.o.emaSpeed;
      const jerk = s.speed - s.prevSpeed;
      if (jerk > this.o.onsetJerk && now - s.lastOnset > this.o.onsetCooldownMs) {
        s.lastOnset = now;
        onsets.push({ point: name, mag: Math.min(1, jerk / (this.o.onsetJerk * 4)) });
      }
      speedSum += s.speed; jerkSum += Math.abs(jerk); n++;
    }

    const rawEnergy = n ? Math.min(1, (speedSum / n) * this.o.energyScale) : 0;
    this.energy += (rawEnergy - this.energy) * this.o.emaEnergy;

    // Smoothness: inverse of jerk relative to speed (1 = glide, 0 = staccato)
    const rawSmooth = n && speedSum > 1e-5
      ? Math.max(0, 1 - (jerkSum / speedSum) * 2) : 1;
    this.smoothness += (rawSmooth - this.smoothness) * 0.1;

    // Stillness: sustained sub-threshold energy ramps 0 → 1 (a gesture, not absence)
    if (this.energy < this.o.stillThresh) {
      if (this._stillSince === null) this._stillSince = now;
      this.stillness = Math.min(1, (now - this._stillSince) / this.o.stillRampMs);
    } else {
      this._stillSince = null;
      this.stillness = 0;
    }

    const points_out = {};
    for (const [name, s] of this.pts)
      points_out[name] = { speed: s.speed, vx: s.vx, vy: s.vy };
    const result = { points: points_out, energy: this.energy,
             smoothness: this.smoothness, stillness: this.stillness, onsets };
    this._lastOutput = result;
    return result;
  }
}

// Detects rhythmic 1-D oscillation (flutter/tremolo band, default 3.5–9 Hz)
// via direction reversals on a lightly smoothed signal. Landmark-agnostic.
//
// Param coupling: `windowMs` only bounds the extrema history behind the
// rate/amp estimate. Deactivation on stillness is governed by the separate
// reversal-recency guard below — one full period at `minHz` (~286ms at the
// default 3.5) since the last direction reversal. Raising `windowMs` does
// NOT lengthen tolerance of mid-gesture pauses; lower `minHz` for that.
export class OscillationDetector {
  constructor({ minHz = 3.5, maxHz = 9, minAmp = 0.008, windowMs = 900 } = {}) {
    Object.assign(this, { minHz, maxHz, minAmp, windowMs });
    this._ema = null; this._dir = 0; this._extrema = []; // {t, v}
    this._lastRaw = null; this._clock = 0; // internal monotonic clock, driven by elapsed dt
    this._lastReversal = 0; // clock time of the most recent confirmed direction reversal
  }
  feed(value, now) {
    // Derive elapsed time from the delta between calls rather than trusting
    // `now` as an absolute clock — callers may restart their timestamp origin
    // (e.g. per-gesture), and a raw-`now` window would never prune stale
    // extrema across such a reset. A non-positive delta (reset or duplicate
    // timestamp) contributes zero elapsed time instead of going backwards.
    if (this._lastRaw === null) this._clock = 0;
    else this._clock += Math.max(0, now - this._lastRaw);
    this._lastRaw = now;
    const t = this._clock;

    this._ema = this._ema === null ? value : this._ema + 0.5 * (value - this._ema);
    const v = this._ema;
    const ex = this._extrema;
    if (ex.length === 0) {
      ex.push({ t, v });
      this._lastReversal = t;
    } else {
      const last = ex[ex.length - 1];
      const dir = Math.sign(v - last.v);
      if (dir !== 0 && this._dir !== 0 && dir !== this._dir) {
        // reversal: `last` is now a finalized extremum — start a new leg
        ex.push({ t, v });
        this._lastReversal = t;
      } else {
        // continuation (or first-ever move from dir=0): extend current leg's endpoint
        last.t = t; last.v = v;
      }
      if (dir !== 0) this._dir = dir;
    }
    while (ex.length && t - ex[0].t > this.windowMs) ex.shift();
    let active = false, rate = 0, amp = 0;
    // Stale guard: the window can still hold extrema from an oscillation that
    // has since stopped (the in-progress leg just keeps extending, mixing old
    // turning points with fresh flat samples). If no reversal has landed
    // recently — within one period at the slowest band rate — there is no
    // live oscillation to report, whatever the window still contains.
    // NOTE: this guard, not `windowMs`, sets the deactivation latency
    // (1000/minHz ms); see the param-coupling note in the class header.
    const recentlyReversing = (t - this._lastReversal) <= 1000 / this.minHz;
    if (ex.length >= 5 && recentlyReversing) {
      const spans = []; let lo = Infinity, hi = -Infinity;
      for (let i = 1; i < ex.length; i++) spans.push(ex[i].t - ex[i - 1].t);
      for (const e of ex) { lo = Math.min(lo, e.v); hi = Math.max(hi, e.v); }
      spans.sort((a, b) => a - b);
      const half = spans[Math.floor(spans.length / 2)]; // median half-period ms
      rate = half > 0 ? 1000 / (2 * half) : 0;
      amp = (hi - lo) / 2;
      active = rate >= this.minHz && rate <= this.maxHz && amp >= this.minAmp;
    }
    return { active, rate, amp };
  }
}
