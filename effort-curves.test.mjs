// handysynth-foundation/effort-curves.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EffortCurves, OscillationDetector, EFFORT_CURVES_VERSION } from './effort-curves.js';

const pt = (x, y) => ({ x, y, visible: true });

function run(ec, frames, dtMs = 33) {
  let out, now = 0;
  for (const f of frames) { now += dtMs; out = ec.feed(f, now); }
  return out;
}

test('version constant exported', () => {
  assert.match(EFFORT_CURVES_VERSION, /^\d+\.\d+\.\d+$/);
});

test('stationary points → stillness rises, energy ~0', () => {
  const ec = new EffortCurves(['a', 'b']);
  const frames = Array.from({ length: 90 }, () => ({ a: pt(0.5, 0.5), b: pt(0.3, 0.6) }));
  const out = run(ec, frames);
  assert.ok(out.energy < 0.02, `energy ${out.energy}`);
  assert.ok(out.stillness > 0.9, `stillness ${out.stillness}`);
  assert.equal(out.onsets.length, 0);
});

test('oscillating point → energy rises, stillness falls', () => {
  const ec = new EffortCurves(['a']);
  const frames = Array.from({ length: 90 }, (_, i) => ({ a: pt(0.5 + 0.2 * Math.sin(i * 0.4), 0.5) }));
  const out = run(ec, frames);
  assert.ok(out.energy > 0.2, `energy ${out.energy}`);
  assert.ok(out.stillness < 0.1, `stillness ${out.stillness}`);
});

test('sudden jump after rest → onset event with point name', () => {
  const ec = new EffortCurves(['a']);
  const rest = Array.from({ length: 30 }, () => ({ a: pt(0.5, 0.5) }));
  run(ec, rest);
  const out = ec.feed({ a: pt(0.8, 0.2) }, 30 * 33 + 33);
  assert.equal(out.onsets.length, 1);
  assert.equal(out.onsets[0].point, 'a');
  assert.ok(out.onsets[0].mag > 0);
});

test('smooth motion scores higher smoothness than jittery motion', () => {
  const smooth = new EffortCurves(['a']);
  const jittery = new EffortCurves(['a']);
  const sFrames = Array.from({ length: 90 }, (_, i) => ({ a: pt(0.3 + i * 0.004, 0.5) }));
  const jFrames = Array.from({ length: 90 }, (_, i) => ({ a: pt(0.3 + i * 0.004 + (i % 2 ? 0.02 : -0.02), 0.5) }));
  assert.ok(run(smooth, sFrames).smoothness > run(jittery, jFrames).smoothness);
});

test('invisible point coasts — no phantom onset on reappear-in-place', () => {
  const ec = new EffortCurves(['a']);
  run(ec, Array.from({ length: 30 }, () => ({ a: pt(0.5, 0.5) })));
  ec.feed({ a: { x: 0.5, y: 0.5, visible: false } }, 31 * 33);
  const out = ec.feed({ a: pt(0.5, 0.5) }, 32 * 33);
  assert.equal(out.onsets.length, 0);
});

test('non-finite coordinate does not poison energy', () => {
  const ec = new EffortCurves(['a']);
  let now = 0, out;
  for (let i = 0; i < 30; i++) { now += 33; out = ec.feed({ a: pt(0.5, 0.5) }, now); }
  now += 33; ec.feed({ a: { x: NaN, y: 0.5, visible: true } }, now);
  for (let i = 0; i < 30; i++) { now += 33; out = ec.feed({ a: pt(0.5, 0.5) }, now); }
  assert.ok(Number.isFinite(out.energy), `energy poisoned: ${out.energy}`);
});
test('backwards timestamp does not produce negative stillness', () => {
  const ec = new EffortCurves(['a']);
  let now = 0, out;
  for (let i = 0; i < 60; i++) { now += 33; out = ec.feed({ a: pt(0.5, 0.5) }, now); }
  now = 0; // clock reset
  for (let i = 0; i < 60; i++) { now += 33; out = ec.feed({ a: pt(0.5, 0.5) }, now); }
  assert.ok(out.stillness >= 0, `negative stillness: ${out.stillness}`);
  assert.ok(Number.isFinite(out.energy));
});

test('version bumped', () => assert.equal(EFFORT_CURVES_VERSION, '0.2.1'));

function drive(od, fn, ms, dt = 16.7) {
  let out;
  for (let t = 0; t <= ms; t += dt) out = od.feed(fn(t / 1000), t);
  return out;
}
test('6 Hz flutter → active, rate in band', () => {
  const od = new OscillationDetector();
  const out = drive(od, s => 0.5 + 0.02 * Math.sin(2 * Math.PI * 6 * s), 1200);
  assert.equal(out.active, true);
  assert.ok(out.rate > 4.8 && out.rate < 7.2, `rate=${out.rate}`);
  assert.ok(out.amp > 0.015);
});
test('2 Hz sway → inactive (below band)', () => {
  const od = new OscillationDetector();
  assert.equal(drive(od, s => 0.5 + 0.05 * Math.sin(2 * Math.PI * 2 * s), 1500).active, false);
});
test('12 Hz jitter → inactive (above band)', () => {
  const od = new OscillationDetector();
  assert.equal(drive(od, s => 0.5 + 0.02 * Math.sin(2 * Math.PI * 12 * s), 1200).active, false);
});
test('sub-amplitude tremor → inactive', () => {
  const od = new OscillationDetector();
  assert.equal(drive(od, s => 0.5 + 0.003 * Math.sin(2 * Math.PI * 6 * s), 1200).active, false);
});
test('stillness after flutter deactivates', () => {
  const od = new OscillationDetector();
  drive(od, s => 0.5 + 0.02 * Math.sin(2 * Math.PI * 6 * s), 1000);
  const out = drive(od, () => 0.5, 600);
  assert.equal(out.active, false);
});
