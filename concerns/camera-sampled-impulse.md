---
id: camera-sampled-impulse
intent: Deliver ballistic gesture energy into a physics sim from a camera-sampled hand without minting energy the camera never saw — ground-truth-at-240 Hz fixtures + resample study, handle interpolation across substeps, displacement-based glitch guard ahead of any smoothing, teleport clamp ahead of the sim
why: Frame sampling flattens ballistic handle paths and bleeds impulse — Boomslang's Phase 0 measured a 120 ms wrist-snap losing ~45% of its emergent tip response at a clean 25 fps purely to sampling phase (tip 1.20 vs 1.76 for the same stroke at 160 ms), and a One-Euro at UI-tuning (mincutoff 1.6, beta 0.02) eating ~2/3 of stroke energy before the sim ever saw it. Worse, smoothing LAUNDERS tracking teleports into fast sub-threshold pseudo-strokes that crack a whip for free, and speed-based glitch guards false-trigger on 60 fps jitter tails and then swallow real strokes. Any variant that feeds a dynamical system (verlet chain, spring, projectile) from camera positions inherits every one of these.
acceptance: A committed stroke fixture resampled to 25 fps still clears the variant's top event threshold across jitter seeds; tremble/sway/rest fixtures at realistic jitter (σ ≈ 0.005 pu) emit zero events; a 1.5 pu teleport fixture and a hand-loss/re-acquire path emit zero events at every fps; the sim is driven only through interpolated substeps (never a frame-to-frame jump); all pinned as node tests against exported defaults.
detection: Variants driving a physics sim directly from per-frame landmark positions (no substep interpolation, no displacement-based glitch guard, or smoothing tuned for cursors rather than energy) are `needs-patch`. Variants with event thresholds calibrated only at ground truth (never through a resample study) are `needs-patch`. Variants with no camera-driven dynamical system are `n/a`.
applicability: Any variant where camera-sampled hand motion injects impulse/energy into simulated dynamics whose emergent state gates audible or visible events (boomslang; future lash-style waveguides, springs, thrown projectiles).
status:
  boomslang: applied@v0.1b
---

## Canonical pattern (from `site/handysynth/boomslang/` — core + spike)

Ground-truth fixtures at 240 Hz, a camera model, and three guards in fixed order:

```javascript
// fixture study: strokeStream/trembleStream/swayStream/teleportStream @240 Hz
resample(path, fps)                    // nearest-previous-sample — cameras don't interpolate
withJitter(path, sigmaPU, seed)        // seeded landmark noise
// pipeline, per raw camera sample:
if (rawJump > glitchJumpPU) filter.reset(raw)   // 1. displacement glitch guard, RAW side
handle = oneEuro.filter(raw, dt)                // 2. jitter-only smoothing (see below)
stepChain(chain, handle, prev, frameDt)         // 3. teleport clamp + substep interpolation inside
```

Load-bearing details:

1. **Frame sampling flattens ballistic paths.** A stroke spanning 3 frames at
   25 fps delivers energy by sampling-phase luck; the same stroke over 4+
   frames delivers reliably. Calibrate event thresholds through the resample
   study, never at ground truth alone (Boomslang: ground-truth tip 2.4+ vs
   camera-rate floor 1.68 for the same committed stroke).
2. **Smoothing is for jitter only.** Strokes (~4 Hz) and trembles (4–8 Hz)
   share a band — their separation belongs to the sim's own dynamics (mass
   taper, damping), NOT the filter. A cursor-tuned One-Euro (mincutoff ≈ 1.6,
   beta ≈ 0.02 — beta contributes ~0.04 Hz at pu/s speeds and never opens)
   destroys ballistic energy. Boomslang ships (mincutoff 2.5, beta 0.5).
3. **Glitch detection by DISPLACEMENT, on the raw sample, before smoothing.**
   One-Euro launders a landmark teleport into a few frames of fast smooth
   motion that reads as a legitimate stroke (measured: free tip speeds of
   8–10 pu/s). Speed-based guards false-trigger on 60 fps jitter tails.
   `glitchJumpPU 0.25` — a single-frame displacement no hand can span.
4. **Recovery must be sticky AND ease out.** A two-regime clamp that releases
   mid-recovery sprints the tail at full handle speed (measured: 8+ pu/s tip);
   a constant-speed glide with a hard stop is itself a mini-stroke (measured:
   phantom pluck at 25 fps). Glide at vRecover (below the event floor) with an
   exponential ease-out landing (~0.25 s), releasing only on arrival.
   Hand-loss re-acquire rides the same path, so re-entry can never fire.
5. **The sim never sees a frame-to-frame jump.** Fixed-dt substeps with the
   pinned driver linearly interpolated across them; the event detector
   consumes the per-frame MAX of substep speeds so inter-frame peaks are
   never missed.

## Energy-delivery map (Phase 0, 2026-07-17)

Committed 2.2 pu/s 160 ms stroke through the full pipeline (chain: taper 32,
damp 0.983, iter 8, g 0.8; One-Euro 2.5/0.5; thresholds pluckOn 1.05,
vCrack 1.45 — Tier 2 re-banding, spec gate table):

| cell | emergent tip peak | events |
|---|---|---|
| stroke @240 ground truth | ≈ 2.4 | 1 crack |
| stroke @25 fps clean | 1.755 | 1 crack |
| stroke @25 fps σ0.005 | 1.68–1.95 (8 seeds) | 1 crack each |
| tremble ±0.03 pu 4/6/8 Hz, camera rates σ0.005 | ≤ 0.94 | 0 |
| sway ±0.3 pu 0.4 Hz, camera rates σ0.005 | ≤ 0.95 | 0 |
| teleport 1.5 pu, camera rates σ0.005 | ≤ 0.77 | 0 |
| rest σ0.005 | ≤ 0.39 | 0 |

Full grid: `site/handysynth/boomslang/spike/energy-fixture.json` (Pyrefey repo,
branch `feat/boomslang-v0.1b`); tuning studies in `spike/sweep.mjs`,
`euro-scan*.mjs`, `jitter-scan.mjs`, `tremble-boundary.mjs`, `variance.mjs`.

Measured boundaries worth reusing:

- **Tremble boundary is an amplitude, not a gesture class.** ±0.03 pu stays
  silent; ±0.06+ honestly answers (it delivers real energy). The original
  ±0.08 "tremble" fixture was deliberate hard shaking at ~3 pu/s handle speed.
- **Jitter realism:** σ 0.02–0.05 pu makes stroke/quiet separation impossible
  for ANY tuning (worst-seed quiet beats worst-seed stroke). Slingtone's spike
  calibrated real landmark jitter at σ ≈ 0.003 normalized (VARIANT-POLISH #1),
  ≈ 0.002 pu through Boomslang's handle window — the σ 0.005 gate assumption
  is conservative. The live probe (`spike/probe.html`) measures the real σ.

## Caveat: synthetic-only (2026-07-17)

The delivery map is synthetic — no human swung at the camera this session
(same protocol as Slingtone's release-snapshot Phase 0, whose Mode A call is
also still synthetic-only). The live probe ships at
`spike/probe.html?NDA=agreed` and displays measured rest-jitter σ and logs
every event with its emergent peak; five minutes at it validates the σ
assumption and the felt thresholds for both variants' methodology at once.
Gate decision marked provisional pending the felt play-test.

## Relationship

- **Physical complement to the flick-transient signal-space approach** (Lash's
  declared-but-unfiled concern, `site/handysynth/lash/index.html:206`): Lash
  classifies the flick in signal space; Boomslang delivers its energy into a
  sim and lets emergent state decide. Same camera constraints, opposite side
  of the detect/dissolve divide.
- **Sibling of velocity-from-history (#10):** `pushPos`/`velAt` velocity is
  for coasting/cosmetics only — a sim must consume positions through the
  pipeline above, never a velocity estimate.
- **Builds on release-snapshot's jitter calibration** (σ ≈ 0.003 normalized)
  and extends it from single-frame reads to sustained energy delivery.
