import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIO_FEATURES_VERSION, bandEdges, bandEnergies, OnsetDetector,
} from './audio-features.js';

test('version constant exported', () => {
  assert.match(AUDIO_FEATURES_VERSION, /^\d+\.\d+\.\d+$/);
});

test('bandEdges: 8 log-spaced bands, 60 Hz–8 kHz, contiguous and ordered', () => {
  const edges = bandEdges(8, 60, 8000, 48000, 2048);
  assert.equal(edges.length, 8);
  // hzPerBin = 48000/2048 = 23.4375; 60 Hz → bin 2 (rounded), 8 kHz → bin 341
  assert.ok(edges[0][0] >= 1, 'first band starts above DC');
  assert.ok(edges[7][1] <= 342, `last band ends by 8 kHz bin, got ${edges[7][1]}`);
  for (let b = 0; b < 8; b++) {
    assert.ok(edges[b][0] <= edges[b][1], `band ${b} non-empty`);
    if (b > 0) assert.equal(edges[b][0], edges[b - 1][1] + 1, `band ${b} contiguous`);
  }
  // log spacing: high bands span more bins than low bands
  const span = (e) => e[1] - e[0];
  assert.ok(span(edges[7]) > span(edges[0]) * 8, 'top band much wider in bins');
});

test('bandEnergies: impulse in one band registers only there', () => {
  const edges = bandEdges(8, 60, 8000, 48000, 2048);
  const mag = new Uint8Array(1024);
  const [lo, hi] = edges[3];
  for (let i = lo; i <= hi; i++) mag[i] = 255;
  const e = bandEnergies(mag, edges);
  assert.ok(Math.abs(e[3] - 1) < 1e-6, 'hot band saturated');
  for (const b of [0, 1, 2, 4, 5, 6, 7]) assert.equal(e[b], 0, `band ${b} silent`);
});

test('OnsetDetector: impulse in band k fires onset k once, refractory holds', () => {
  const edges = bandEdges(8, 60, 8000, 48000, 2048);
  const det = new OnsetDetector(8);
  const quiet = new Uint8Array(1024);
  const hot = new Uint8Array(1024);
  const [lo, hi] = edges[5];
  for (let i = lo; i <= hi; i++) hot[i] = 220;

  let now = 0;
  for (let f = 0; f < 30; f++) { det.detect(quiet, edges, now); now += 16; } // settle
  const hit = det.detect(hot, edges, now); now += 16;
  assert.ok(hit[5].fired, 'band 5 fires on impulse');
  assert.ok(hit[5].strength > 0, 'strength positive');
  for (const b of [0, 1, 2, 3, 4, 6, 7]) assert.ok(!hit[b].fired, `band ${b} silent`);

  const again = det.detect(hot, edges, now); // 16ms later, inside 80ms refractory
  assert.ok(!again[5].fired, 'refractory suppresses immediate refire');
});

test('OnsetDetector: steady tone fires nothing after onset', () => {
  const edges = bandEdges(8, 60, 8000, 48000, 2048);
  const det = new OnsetDetector(8);
  const tone = new Uint8Array(1024);
  const [lo, hi] = edges[2];
  for (let i = lo; i <= hi; i++) tone[i] = 180;
  let now = 0, fires = 0;
  for (let f = 0; f < 60; f++) {
    const r = det.detect(tone, edges, now);
    if (f > 10 && r[2].fired) fires++; // ignore the initial attack
    now += 16;
  }
  assert.equal(fires, 0, 'sustained tone is not an onset');
});
