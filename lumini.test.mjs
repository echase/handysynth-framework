// handysynth-foundation/lumini.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LUMINI_VERSION, OneEuro, heatColor, smoothEnergy, screenToGL, PRESETS,
  VEL_TO_DELTA, splatMomentum,
} from './lumini.js';

test('version constant exported', () => {
  assert.match(LUMINI_VERSION, /^\d+\.\d+\.\d+$/);
});

test('OneEuro passes first sample through unchanged', () => {
  const f = new OneEuro();
  assert.equal(f.filter(0.5, 1 / 60), 0.5);
});

test('OneEuro is steadier at rest than a fast slide', () => {
  const still = new OneEuro();
  const dt = 1 / 60;
  still.filter(0.5, dt);
  const noisy = [0.51, 0.49, 0.505, 0.495, 0.5];
  let last = 0.5;
  for (const v of noisy) last = still.filter(v, dt);
  // heavy smoothing at rest keeps output near the mean
  assert.ok(Math.abs(last - 0.5) < 0.01, `rest output ${last}`);
});

test('heatColor brightness increases monotonically with t', () => {
  const b = (t) => { const c = heatColor(t); return c.r + c.g + c.b; };
  assert.ok(b(0.1) < b(0.5), 'mid brighter than low');
  assert.ok(b(0.5) < b(0.95), 'high brighter than mid');
});

test('smoothEnergy moves toward target and clamps', () => {
  assert.ok(Math.abs(smoothEnergy(0, 1, 0.1) - 0.1) < 1e-9);
  assert.equal(smoothEnergy(0.98, 5, 0.5), 1); // target clamped, output clamped
  assert.equal(smoothEnergy(-3, 0, 0.5), 0);
});

test('screenToGL flips y and dy only', () => {
  assert.deepEqual(screenToGL(0.3, 0.25, 2, 4), { x: 0.3, y: 0.75, dx: 2, dy: -4 });
});

test('presets are frozen and mobile is cheaper', () => {
  assert.ok(Object.isFrozen(PRESETS.classic));
  assert.ok(PRESETS.ember.DYE_RESOLUTION < PRESETS.classic.DYE_RESOLUTION);
  assert.equal(PRESETS.ember.BLOOM, false);
});

test('splatMomentum converts u/s velocity to Lumora per-frame-delta force', () => {
  assert.equal(VEL_TO_DELTA, 1 / 60);
  assert.equal(splatMomentum(0.6, 6000), 60);   // 0.6 u/s ≈ 0.01/frame × 6000
  assert.equal(splatMomentum(-0.12, 6000), -12);
});
