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
export const EFFORT_CURVES_VERSION = '0.1.0';

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
  }

  feed(points, now) {
    const dt = this._lastNow === null ? 33 : Math.max(1, now - this._lastNow);
    this._lastNow = now;
    const onsets = [];
    let speedSum = 0, jerkSum = 0, n = 0;

    for (const [name, s] of this.pts) {
      const p = points[name];
      if (!p || p.visible === false) {
        // Coast: hold position, bleed speed, re-arm cleanly on reappear
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
    return { points: points_out, energy: this.energy,
             smoothness: this.smoothness, stillness: this.stillness, onsets };
  }
}
