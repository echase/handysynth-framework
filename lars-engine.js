// handysynth-foundation/lars-engine.js
/**
 * LarsEngine — pure sequencing brain for the "Lars Walks In" backing kit
 * (Pulling Cliff v0.14b; spec: docs/pulling-cliff-lars-walks-in-2026-07-16-spec.md).
 *
 * DOM- and AudioContext-free: pattern data, grid math, intensity following,
 * arming, and the lifecycle state machine. The variant owns the WebAudio
 * voices and the lookahead scheduler and asks this module what to play.
 * Single-file variants inline a pinned copy (ADR 014). All identifiers carry
 * a lars/LARS_ prefix — the inline copy shares one page scope.
 */
export const LARS_ENGINE_VERSION = '1.0.0';

// ── grid ──
export const LARS_STEPS_PER_BAR = 16;
export const LARS_Z16 = Object.freeze(new Array(16).fill(0));
export function larsStepDur(bpm) { return 60 / bpm / 4; }   // seconds per 16th

// ── pattern bank: velocity per 16th step, 0 = rest ──
// tiers: 0 simmer · 1 walk · 2 drive · 3 gallop (spec §5)
export const LARS_TIERS = [
  { kick:   [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    snare:  [0,0,0,0, 0,0,0,0, 0,0,0.15,0, 0,0,0,0],
    hat:    [0.5,0,0,0, 0.4,0,0,0, 0.5,0,0,0, 0.4,0,0,0],
    hatOpen: LARS_Z16, crash: LARS_Z16 },
  { kick:   [1,0,0,0, 0,0,0,0, 0.9,0,0,0, 0,0,0,0],
    snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    hat:    [0.8,0,0.45,0, 0.7,0,0.45,0, 0.8,0,0.45,0, 0.7,0,0.45,0],
    hatOpen: LARS_Z16, crash: LARS_Z16 },
  { kick:   [1,0,0,0.6, 0,0,0.8,0, 0.9,0,0,0, 0,0.6,0,0],
    snare:  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0.25],
    hat:    LARS_Z16,
    hatOpen:[0.8,0,0.55,0, 0.7,0,0.55,0, 0.8,0,0.55,0, 0.7,0,0.6,0],
    crash:  LARS_Z16 },
  { kick:   [1,0,0.7,0.8, 1,0,0.7,0.8, 1,0,0.7,0.8, 1,0,0.7,0.8],
    snare:  [0,0,0,0, 1,0,0,0.25, 0,0,0.2,0, 1,0,0,0.3],
    hat:    [0.8,0,0.5,0, 0.8,0,0.5,0, 0.8,0,0.5,0, 0.8,0,0.5,0],
    hatOpen: LARS_Z16,
    crash:  [0.7,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0] },
];

// fills are partial overrides — unlisted voices keep the tier's arrays
export const LARS_FILLS = {
  small: { snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0.3,0.4] },
  run:   { snare: [0,0,0,0, 1,0,0,0, 0.5,0.55,0.6,0.65, 0.75,0.85,0.95,1],
           hat: LARS_Z16, hatOpen: LARS_Z16 },
  entry: { kick:  [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
           snare: [0.3,0.35,0.4,0.45, 0.5,0.55,0.6,0.65, 0.7,0.75,0.8,0.85, 0.9,0.95,1,1],
           hat: LARS_Z16, hatOpen: LARS_Z16, crash: LARS_Z16 },
  exit:  { kick:  [1,0,0,0, 0,0,0,0, 0.9,0,0,0, 0,0,0,0],
           snare: [0,0,0,0, 1,0,0,0, 0.6,0.7,0.8,0.9, 1,0,1,1],
           hat: LARS_Z16, hatOpen: LARS_Z16, crash: LARS_Z16 },
};

const LARS_CRASH_HEAD = Object.freeze([0.8,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]);

// merged fills / 4-bar variation / phrase-head crash — deterministic (spec §5)
export function larsPatternForBar(tier, bar) {
  const base = LARS_TIERS[tier];
  if (bar % 8 === 7) return Object.assign({}, base, LARS_FILLS.run);
  if (bar % 4 === 3) return Object.assign({}, base, LARS_FILLS.small);
  if (tier >= 2 && bar % 4 === 0) return Object.assign({}, base, { crash: LARS_CRASH_HEAD });
  return base;
}

// ── intensity follower: slow EMA over 0.6·vol + 0.4·drive (spec §5) ──
export class LarsIntensityFollower {
  constructor(tau = 2.5) { this.tau = tau; this.value = 0; }
  tick(dt, vol, drive) {
    const target = Math.min(1, 0.6 * vol + 0.4 * drive);
    this.value += (target - this.value) * (1 - Math.exp(-dt / this.tau));
    return this.value;
  }
}

// ── tier mapping with ±0.08 hysteresis — flap-proof ──
const LARS_TIER_UP = [0.18, 0.38, 0.62], LARS_TIER_HYS = 0.08;
export function larsTierFor(intensity, prev) {
  let t = prev;
  while (t < 3 && intensity > LARS_TIER_UP[t] + LARS_TIER_HYS) t++;
  while (t > 0 && intensity < LARS_TIER_UP[t - 1] - LARS_TIER_HYS) t--;
  return t;
}

// ── leaky arming accumulator: rests drain progress, never hard-reset it ──
export class LarsLeakyAccumulator {
  constructor(target = 40, drainRatio = 0.5) {
    this.target = target; this.drainRatio = drainRatio; this.value = 0;
  }
  tick(dt, playing) {
    this.value = Math.max(0, Math.min(this.target,
      this.value + (playing ? dt : -dt * this.drainRatio)));
    return this.value;
  }
  reset() { this.value = 0; }
}

// ── humanization: tight but human (spec §5) ──
export function larsHumanize(voice, vel, rng = Math.random) {
  const jitter = (voice === 'hat' || voice === 'hatOpen') ? 0.004 : 0.002;
  return {
    offset: (rng() * 2 - 1) * jitter,
    vel: Math.max(0.05, Math.min(1, vel * (1 + (rng() * 2 - 1) * 0.15))),
  };
}

// ── lifecycle state machine (spec §2) ──
// tick() runs at frame rate; onBar() is called by the scheduler exactly once
// per bar boundary and owns every state change that must land on the grid.
export class LarsBrain {
  constructor(opts = {}) {
    this.playThresh    = opts.playThresh    ?? 0.05;
    this.silenceThresh = opts.silenceThresh ?? 0.03;
    this.silenceExit   = opts.silenceExit   ?? 8;
    this.countinBars   = opts.countinBars   ?? 2;
    this.acc = new LarsLeakyAccumulator(opts.armTarget ?? 40, opts.drainRatio ?? 0.5);
    this.state = 'off';
    this.silence = 0;
    this.pendingExit = false;
  }
  tick(dt, vol, mode, barDur) {
    if (mode === 'off') {
      if (this.state === 'in') { this.state = 'exitfill'; this.pendingExit = true; return null; }
      if (this.state === 'exitfill') return null;
      const wasCountin = this.state === 'countin';
      this.state = 'off'; this.acc.reset(); this.silence = 0;
      return wasCountin ? 'stop' : null;
    }
    if (mode === 'on' && (this.state === 'off' || this.state === 'arming')) {
      this.state = 'countin'; this.silence = 0;
      return 'start-countin';
    }
    switch (this.state) {
      case 'off': this.state = 'arming';   // fall through
      case 'arming':
        this.acc.tick(dt, vol > this.playThresh);
        if (this.acc.value >= this.acc.target - this.countinBars * barDur) {
          this.state = 'countin';
          return 'start-countin';
        }
        return null;
      case 'in':
        if (mode === 'auto') {
          this.silence = vol < this.silenceThresh ? this.silence + dt : 0;
          if (this.silence >= this.silenceExit) { this.state = 'exitfill'; this.pendingExit = true; }
        } else this.silence = 0;
        return null;
      default: return null;
    }
  }
  onBar(countinBarsElapsed) {
    if (this.state === 'countin' && countinBarsElapsed >= this.countinBars) {
      this.state = 'in'; this.acc.reset(); this.silence = 0;
      return 'walkin';
    }
    if (this.state === 'exitfill') {
      if (this.pendingExit) { this.pendingExit = false; return 'exitbar'; }
      this.state = 'off'; this.acc.reset(); this.silence = 0;
      return 'stopped';
    }
    return null;
  }
}
