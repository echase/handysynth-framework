// handysynth-foundation/lars-engine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LARS_ENGINE_VERSION, LARS_STEPS_PER_BAR, LARS_Z16, larsStepDur,
  LARS_TIERS, LARS_FILLS, larsPatternForBar,
} from './lars-engine.js';

const VOICES = ['kick', 'snare', 'hat', 'hatOpen', 'crash'];

test('version constant exported', () => {
  assert.match(LARS_ENGINE_VERSION, /^\d+\.\d+\.\d+$/);
});

test('16th-note step duration', () => {
  assert.ok(Math.abs(larsStepDur(185) - 60 / 185 / 4) < 1e-12);
  assert.equal(LARS_STEPS_PER_BAR, 16);
  assert.equal(LARS_Z16.length, 16);
});

test('every tier has 5 voices × 16 steps, kick anchors the downbeat', () => {
  assert.equal(LARS_TIERS.length, 4);
  for (const tier of LARS_TIERS) {
    for (const v of VOICES) {
      assert.ok(Array.isArray(tier[v]), `${v} missing`);
      assert.equal(tier[v].length, 16);
    }
    assert.ok(tier.kick[0] > 0, 'kick on 1');
  }
});

test('plain bar returns the base tier pattern', () => {
  assert.deepEqual(larsPatternForBar(1, 1), LARS_TIERS[1]);
});

test('4-bar variation and 8-bar run fill', () => {
  const small = larsPatternForBar(1, 3);
  assert.ok(small.snare[14] > 0, 'small fill adds back-quarter ghosts');
  const run = larsPatternForBar(2, 7);
  const tail = run.snare.slice(12);
  for (let i = 1; i < tail.length; i++) assert.ok(tail[i] >= tail[i - 1], 'run ascends');
  assert.equal(run.snare[15], 1, 'run peaks at the bar line');
});

test('phrase-head crash only for tiers ≥ 2', () => {
  assert.ok(larsPatternForBar(2, 4).crash[0] > 0);
  assert.ok(larsPatternForBar(3, 0).crash[0] > 0);
  assert.equal(larsPatternForBar(1, 4).crash[0], 0);
});

test('entry and exit fills build to the bar line', () => {
  const e = LARS_FILLS.entry.snare;
  for (let i = 1; i < 16; i++) assert.ok(e[i] >= e[i - 1], 'entry snare builds');
  assert.equal(e[15], 1);
  assert.ok(LARS_FILLS.exit.snare[12] === 1, 'exit run lands hard');
});

import {
  LarsIntensityFollower, larsTierFor, LarsLeakyAccumulator, larsHumanize,
} from './lars-engine.js';

test('follower converges and honors its time constant', () => {
  const f = new LarsIntensityFollower();
  for (let i = 0; i < 2000; i++) f.tick(1 / 60, 1, 1);
  assert.ok(f.value > 0.95, `converged: ${f.value}`);
  const g = new LarsIntensityFollower(2.5);
  for (let i = 0; i < 150; i++) g.tick(1 / 60, 1, 1);   // 2.5s of frames
  assert.ok(Math.abs(g.value - 0.632) < 0.05, `one tau ≈ 63%: ${g.value}`);
});

test('tier mapping is sticky (hysteresis)', () => {
  assert.equal(larsTierFor(0.50, 1), 2);   // clears 0.38 + 0.08
  assert.equal(larsTierFor(0.42, 1), 1);   // inside the band — no move up
  assert.equal(larsTierFor(0.42, 2), 2);   // inside the band — no move down
  assert.equal(larsTierFor(0.05, 1), 0);
  assert.equal(larsTierFor(0.95, 0), 3);
});

test('accumulator leaks at half rate and clamps', () => {
  const a = new LarsLeakyAccumulator(40, 0.5);
  for (let i = 0; i < 100; i++) a.tick(0.1, true);    // 10s playing
  assert.ok(Math.abs(a.value - 10) < 1e-9);
  for (let i = 0; i < 100; i++) a.tick(0.1, false);   // 10s silent
  assert.ok(Math.abs(a.value - 5) < 1e-9);
  for (let i = 0; i < 10000; i++) a.tick(0.1, true);
  assert.equal(a.value, 40);
  a.reset(); assert.equal(a.value, 0);
  a.tick(1, false); assert.equal(a.value, 0);
});

test('humanize: hats jitter wider than kick, velocity clamps', () => {
  const mid = larsHumanize('kick', 0.8, () => 0.5);
  assert.equal(mid.offset, 0); assert.ok(Math.abs(mid.vel - 0.8) < 1e-9);
  const hot = larsHumanize('hat', 1, () => 1);
  assert.ok(Math.abs(hot.offset - 0.004) < 1e-9, 'hat jitter ±4ms');
  assert.equal(hot.vel, 1, 'velocity clamps at 1');
  const kick = larsHumanize('kick', 0.5, () => 1);
  assert.ok(Math.abs(kick.offset - 0.002) < 1e-9, 'kick jitter ±2ms');
});
