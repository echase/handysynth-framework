// handysynth-foundation/lumini.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LUMINI_VERSION, OneEuro, heatColor, smoothEnergy, screenToGL, PRESETS,
  VEL_TO_DELTA, splatMomentum, hubConfig, resolveSplatRadius,
  circleSDF, containVelocity, STOCK_IDLE_EMITTERS, resolveIdleEmitters,
  idleEmitterTick,
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

test('heatColor: default heatRampCap (1) is v0.4.1-identical', () => {
  assert.deepEqual(heatColor(0.8), heatColor(0.8, 1));
  assert.deepEqual(heatColor(1), { r: 0.95, g: 0.74, b: 0.87 }); // uncapped ramp hits near-white
});

test('heatColor: heatRampCap caps the ramp below its uncapped value', () => {
  // pulling-cliff v0.12b mellow tuning: t=1 capped at 0.55 stays short of white
  const capped = heatColor(1, 0.55);
  const uncapped = heatColor(1, 1);
  assert.deepEqual(capped, heatColor(0.55)); // cap(1) === evaluating the ramp at u=0.55
  assert.ok(capped.r + capped.g + capped.b < uncapped.r + uncapped.g + uncapped.b);
});

test('smoothEnergy moves toward target and clamps', () => {
  assert.ok(Math.abs(smoothEnergy(0, 1, 0.1, 0.1) - 0.1) < 1e-9);
  // Brief deviation (Task 3): target is clamped BEFORE blending (see impl),
  // so 0.98 -> clamp01(5)=1 at coef 0.5 lands at 0.99, not 1 (no overshoot
  // to clamp against). Corrected from the brief's literal `1`.
  assert.equal(smoothEnergy(0.98, 5, 0.5, 0.5), 0.99); // target clamped, output clamped
  assert.equal(smoothEnergy(-3, 0, 0.5, 0.5), 0);
});

test('smoothEnergy attacks faster than it releases', () => {
  assert.ok(Math.abs(smoothEnergy(0, 1, 0.5, 0.06) - 0.5) < 1e-9);   // rising → attack coef
  assert.ok(Math.abs(smoothEnergy(1, 0, 0.5, 0.06) - 0.94) < 1e-9);  // falling → release coef
  assert.equal(smoothEnergy(0, 1, 0.5), 0.5);                        // 3-arg back-compat
});

test('screenToGL flips y and dy only', () => {
  assert.deepEqual(screenToGL(0.3, 0.25, 2, 4), { x: 0.3, y: 0.75, dx: 2, dy: -4 });
});

test('presets are frozen and mobile is cheaper', () => {
  assert.ok(Object.isFrozen(PRESETS.classic));
  assert.ok(PRESETS.ember.DYE_RESOLUTION < PRESETS.classic.DYE_RESOLUTION);
  assert.equal(PRESETS.ember.BLOOM, false);
});

test('mellow preset: v0.4.1 presets carry no v0.5.0 knob defaults', () => {
  // classic/ember must stay bare so mount()'s `preset.KNOB ?? hardDefault`
  // fallback actually reaches the hard default — this is the backward-compat
  // guarantee, checked at the data level rather than by spinning up a mount.
  for (const p of [PRESETS.classic, PRESETS.ember]) {
    assert.equal(p.heatRampCap, undefined);
    assert.equal(p.hubScale, undefined);
    assert.equal(p.idleEmitters, undefined);
  }
});

test('mellow preset: softened classic GL fields + pulling-cliff v0.12b knob values', () => {
  const m = PRESETS.mellow;
  assert.ok(Object.isFrozen(m));
  assert.equal(m.SPLAT_FORCE, 4500);
  assert.equal(m.BLOOM_THRESHOLD, 0.7);
  assert.equal(m.heatRampCap, 0.55);
  assert.equal(m.hubScale, 0.5);
  assert.equal(m.idleEmitters, 1);
  assert.equal(m.idleEmitterSeeds.length, 1);
});

test('splatMomentum converts u/s velocity to Lumora per-frame-delta force', () => {
  assert.equal(VEL_TO_DELTA, 1 / 60);
  assert.equal(splatMomentum(0.6, 6000), 60);   // 0.6 u/s ≈ 0.01/frame × 6000
  assert.equal(splatMomentum(-0.12, 6000), -12);
});

test('hubConfig is laminar at rest, monotonic in energy and grit', () => {
  const rest = hubConfig(0, 0, 8, 0.35);
  assert.equal(rest.CURL, 8);
  assert.equal(rest.BLOOM_INTENSITY, 0.35);
  assert.ok(hubConfig(0.5, 0, 8, 0.35).CURL < hubConfig(1, 0, 8, 0.35).CURL);
  assert.ok(hubConfig(0.5, 0, 8, 0.35).CURL < hubConfig(0.5, 1, 8, 0.35).CURL);
  assert.equal(hubConfig(1, 1, 8, 0.35).CURL, 46);
  assert.equal(hubConfig(1, 0, 8, 0.35).BLOOM_INTENSITY, 1.0);
});

test('hubConfig: default hubScale (1) is v0.4.1-identical', () => {
  assert.deepEqual(hubConfig(0.7, 0.4, 8, 0.35), hubConfig(0.7, 0.4, 8, 0.35, 1));
});

test('hubConfig: hubScale scales only the energy/grit contribution', () => {
  // mellow preset's hubScale (0.5): baseCurl/baseBloom pass through untouched,
  // the grit·8 / energy·30 / energy·0.65 terms are halved.
  const half = hubConfig(1, 1, 8, 0.35, 0.5);
  assert.equal(half.CURL, 8 + 4 + 15); // base + grit·8·0.5 + energy·30·0.5
  assert.equal(half.BLOOM_INTENSITY, 0.35 + 0.325); // base + energy·0.65·0.5
  const rest = hubConfig(0, 0, 8, 0.35, 0.5);
  assert.equal(rest.CURL, 8, 'hubScale never touches baseCurl at rest');
  assert.equal(rest.BLOOM_INTENSITY, 0.35, 'hubScale never touches baseBloom at rest');
});

test('resolveIdleEmitters: default count is the full stock pool (v0.4.1: 3)', () => {
  const all = resolveIdleEmitters(STOCK_IDLE_EMITTERS.length, STOCK_IDLE_EMITTERS);
  assert.equal(all.length, 3);
  assert.deepEqual(all, STOCK_IDLE_EMITTERS);
  // undefined/out-of-range count falls back to the whole pool, not zero
  assert.equal(resolveIdleEmitters(undefined, STOCK_IDLE_EMITTERS).length, 3);
  assert.equal(resolveIdleEmitters(-1, STOCK_IDLE_EMITTERS).length, 3);
});

test('resolveIdleEmitters: count trims the pool (mellow: 1)', () => {
  const one = resolveIdleEmitters(1, STOCK_IDLE_EMITTERS);
  assert.equal(one.length, 1);
  assert.deepEqual(one[0], STOCK_IDLE_EMITTERS[0]);
  assert.equal(resolveIdleEmitters(0, STOCK_IDLE_EMITTERS).length, 0);
});

test('idleEmitterTick: default gain/heatMax is v0.4.1-identical', () => {
  const e = { fx: 0.7, fy: 1.1, phase: 0.0, rate: 0.08, t: 0.42 };
  assert.deepEqual(idleEmitterTick(e, 0.6), idleEmitterTick(e, 0.6, { vx: 0.18, vy: 0.15 }, 0.15));
});

test('idleEmitterTick: mellow gain softens velocity and heat vs stock', () => {
  const e = { fx: 0.7, fy: 1.1, phase: 0.0, rate: 0.08, t: 0.42 };
  const stock = idleEmitterTick(e, 1);
  const mellow = idleEmitterTick(e, 1, { vx: 0.07, vy: 0.06 }, 0.10);
  assert.equal(stock.x, mellow.x, 'position is gain/heat independent');
  assert.equal(stock.y, mellow.y);
  assert.ok(Math.abs(mellow.dx) < Math.abs(stock.dx), 'mellow vx gain is softer');
  assert.ok(Math.abs(mellow.dy) < Math.abs(stock.dy), 'mellow vy gain is softer');
  assert.ok(mellow.heat < stock.heat, 'mellow heat cap is lower');
});

test('idleEmitterTick: idleFade of 0 silences velocity and heat', () => {
  const e = { fx: 0.7, fy: 1.1, phase: 0.0, rate: 0.08, t: 0.42 };
  const s = idleEmitterTick(e, 0);
  assert.equal(s.dx, 0);
  assert.equal(s.dy, 0);
  assert.equal(s.heat, 0);
});

test('resolveSplatRadius: explicit radius wins, undefined/null/0 fall back', () => {
  assert.equal(resolveSplatRadius(0.4, 0.25), 0.4);
  assert.equal(resolveSplatRadius(undefined, 0.25), 0.25);
  assert.equal(resolveSplatRadius(null, 0.25), 0.25);
  assert.equal(resolveSplatRadius(0, 0.25), 0.25);
});

test('circleSDF: center depth, rim zero, aspect-corrected roundness', () => {
  const c = circleSDF(0.5, 0.5, 0.5, 0.5, 0.3, 1.0);
  assert.ok(Math.abs(c.d - (-0.3)) < 1e-9, 'center is -r deep');
  const rim = circleSDF(0.5, 0.8, 0.5, 0.5, 0.3, 1.0);
  assert.ok(Math.abs(rim.d) < 1e-9, 'rim is 0');
  assert.ok(Math.abs(rim.ny - 1) < 1e-9, 'normal points outward (+y)');
  // aspect 2: a point 0.15 right of center is 0.30 away in corrected space
  const wide = circleSDF(0.65, 0.5, 0.5, 0.5, 0.3, 2.0);
  assert.ok(Math.abs(wide.d) < 1e-9, 'aspect-corrected x distance hits the rim');
});

test('containVelocity: deep inside untouched', () => {
  const v = containVelocity(0.3, -0.2, -0.5, 0, 1, 0.05);
  assert.equal(v.vx, 0.3); assert.equal(v.vy, -0.2);
});

test('containVelocity: outward at rim removed, tangential preserved', () => {
  // at the wall (d=0), normal (0,1): pure outward dies, tangential survives
  const out = containVelocity(0, 0.4, 0, 0, 1, 0.05);
  assert.ok(Math.abs(out.vy) < 1e-9, 'outward component removed at rim');
  const tan = containVelocity(0.4, 0, 0, 0, 1, 0.05);
  assert.equal(tan.vx, 0.4, 'tangential untouched');
});

test('containVelocity: inward at rim untouched, outside hard-damped', () => {
  const inward = containVelocity(0, -0.4, 0, 0, 1, 0.05);
  assert.equal(inward.vy, -0.4, 'inward flow never blocked');
  const outside = containVelocity(0.4, 0.4, 0.01, 0, 1, 0.05);
  assert.ok(Math.abs(outside.vx - 0.02) < 1e-9 && Math.abs(outside.vy - 0.02) < 1e-9, 'outside ×0.05');
});

test('containVelocity: wall band ramps — half-depth outward half-removed', () => {
  // d = -feather/2 → wall factor 0.5 → outward halved
  const v = containVelocity(0, 0.4, -0.025, 0, 1, 0.05);
  assert.ok(Math.abs(v.vy - 0.2) < 1e-9, `expected 0.2, got ${v.vy}`);
});
