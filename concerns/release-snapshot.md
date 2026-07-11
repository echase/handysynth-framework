---
id: release-snapshot
intent: Sample release-triggered launch parameters from a 1-frame-lookback snapshot, never the release frame itself
why: The pinch-open pop lands its landmark jitter on the release frame — the exact frame a release-triggered variant needs tension/aim/position from. Slingtone's Phase 0 spike measured naive release-frame reads degrading to 30–38% recoverable at fast releases, while the 1-frame-lookback snapshot stayed 100% recoverable across the whole grid. Every release-triggered variant (Slingtone, Lumen, Finger Guns, future Siphon & Cast) needs the same sampler.
acceptance: A fast, hard pinch-open launches with the tension/aim the player held just before the pop — no wild shots on fast releases; a jittered synthetic release fixture recovers pre-pop values through the sampler (slingtone-core.test.mjs); no launch fires from a dirty pre-release history.
detection: Release-triggered variants that read gesture parameters at the frame the release edge is detected (live read at pinch-open) are `needs-patch`. Variants sampling from a history buffer at release−1 with a stability guard are `applied`. Variants with no release-triggered mapping are `n/a`.
applicability: Any variant that fires an event from a pinch/grip release and reads continuous parameters (position, separation, angle, velocity) at that instant.
status:
  slingtone: applied@v0.1b
  lumen: unknown
  finger-guns: unknown
---

## Canonical pattern (from `site/handysynth/slingtone/slingtone-core.mjs`)

Ring-buffer the tracked anchor state every frame; on the release edge, sample at
`releaseIdx − 1`, and refuse to fire when the lookback frames are unstable:

```javascript
pushAnchorHistory(history, frame);            // every frame, BEFORE edge detection
const opened = detectRelease(prevPinch, currPinch, pinchOff);
if (opened.length) {
  // Sample IMMEDIATELY, same frame — a stored index goes stale as the ring shifts
  const snap = snapshotOnRelease(history, history.length - 1, { restLen, maxStretch, pinchOff });
  if (snap) launch(snap);                     // null = dirty history → refuse, never fire garbage
}
```

Load-bearing details:

1. **Lookback, not live read.** The pop's jitter lands on the release frame;
   the frame prior still holds the true stretch/aim.
2. **Sample at detection time.** The spike's first harness stored the release
   index and sampled later — by then the ring buffer had shifted and the index
   pointed at a post-release frame. Real integration hazard: snapshot in the
   same frame the edge is detected.
3. **Stability guard.** `snapshotOnRelease` returns null unless the two frames
   before the release are pinched-and-quiet (`frameStable`: both pinches held,
   anchor jump < 0.045 normalized). Prevention over forgiveness: a refused
   launch costs nothing; a phantom launch is unrecoverable.

## Release-fidelity map (Phase 0 spike, 2026-07-11)

Synthetic streams through the real sampler, calibrated to documented platform
behavior (±2–5px landmark jitter → σ ≈ 0.003 normalized per VARIANT-POLISH #1;
pinchOff 0.092; 30fps; opening-hand splay shifting the pinch midpoint ≤ 0.032
with 2–10× jitter spikes). 90 trials/cell over stretch 0.15–0.9 × band angle
0–150°. Acceptance: tension error < half a quantization step (0.056), aim
error < 6°. Runner: `site/handysynth/slingtone/spike/release-spike.mjs`.

| Release speed | Pop | release-frame OK (worst style) | lookback OK | refused |
|---|---|---|---|---|
| slow (5f ≈150ms) | 2–10× | 83–100% | **100%** | 0% |
| medium (2f ≈66ms) | 2–10× | 72–100% | **100%** | 0% |
| fast (1f ≈33ms) | 2–10× | **30–69%** | **100%** | 0% |

- Worst lookback aim error 4.9°, worst tension error 0.055 — both at slow/10×,
  where the gradual splay partially contaminates the lookback frame. One-Euro
  smoothing on the anchors (the spike ran raw positions) shrinks this further.
- Both-anchors-simultaneous release recovers as cleanly as single-anchor —
  two-pinch (Mode A) front ends are viable.
- No unreadable region inside the modeled envelope. Total tracking dropout
  produces no release edge at all → the no-launch path, by construction.

**Caveat:** the map is synthetic (no recorded real-hand fixtures exist in the
repo yet). The live companion probe
(`site/handysynth/slingtone/spike/probe.html`) logs the same lookback-vs-release
deltas from a real camera; first real-hand pass is folded into Slingtone's
play-test checklist. Replace/append real measurements here when captured.

## Relationship to VARIANT-POLISH

Sibling of #10 (velocity sensitivity) and the `velocity-from-history` concern:
both read gesture history at a trigger edge. This concern owns the *release*
edge specifically, where the trigger itself corrupts the frame being read.
