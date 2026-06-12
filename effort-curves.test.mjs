// handysynth-foundation/effort-curves.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EffortCurves, EFFORT_CURVES_VERSION } from './effort-curves.js';

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
