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
