---
id: reversal-recoverability
intent: Commit an impulsive gesture at the velocity zero-cross of a camera-sampled backswing — anticipatory prediction from the decelerating pre-blur wind, decel-gated zero-cross confirmation, constant-deceleration coasting across dropout at the reversal, and a recoverability map over amplitude × speed × frame rate
why: The reversal is the single most information-critical instant of any wind-up-and-release instrument (every parameter samples there) and it is exactly where camera tracking degrades. Skipping Stone's Phase 0 measured — through the camera-sampled-impulse degradation model — that the reversal EVENT recovers at 100% for backswings ≥ 0.3 pu at moderate speeds (25–30 fps), that commit latency is deterministic (median 67–71 ms late at 25–30 fps, p90 ≈ 100 ms; anticipation lands slow lobs up to 100 ms EARLY), and that three plausible detector designs are traps — an ungated zero-cross check fires on every body-sway turn (ω²A ≈ 1.9 pu/s² vs a thrown reversal's ≥ 4), a confirm-window that commits below cancel-speed misfires mid-wind on slow throws (a gentle throw's whole tail sits under any usable cancel threshold), and a coast model armed only at prediction time cannot recover a reversal whose approach frames blurred out
acceptance: Ancillary battery silent across fps {25,30,60} × σ {0.003,0.005} × seeds — sway ±0.08 pu 0.4 Hz, tremble ±0.03 pu 4–8 Hz, rest, and a 1.5 pu teleport all emit ZERO commits; committed throws in the recoverable region emit exactly ONE commit within [-150, +150] ms of ground-truth reversal with cross-seed kinematic CV ≤ 0.12; a 2-frame dropout centered on the reversal still commits (coast path); all pinned as node tests against exported defaults
detection: Wind-up/throw variants that commit at a raw velocity zero-cross without a deceleration floor are `needs-patch` (sway false-fires every cycle). Variants whose confirm-window fallback commits at any speed below cancel-speed are `needs-patch` (mid-wind misfire on slow throws). Variants sampling reversal kinematics without a windowed-velocity channel separate from the cosmetic position filter are `needs-patch` (camera-sampled-impulse two-budget rule). Variants with no impulsive reversal commit are `n/a`.
applicability: Any variant committing parameters at a measured motion reversal (skipping-stone; future drumspace-style backswing velocity, Siphon & Cast draw release, crystal-harp attack shaping — the §L anticipatory-trigger family).
status:
  skipping-stone: applied@v0.1b
---

## Canonical pattern (from `site/handysynth/skipping-stone/throw.mjs` v0.1.0)

All signals from the **palm centroid** (most dropout-robust point), RAW behind
a displacement glitch guard — the One-Euro position channel is cosmetic only
and never feeds the detector (two smoothing budgets,
→ see: [[camera-sampled-impulse]]). Velocity is windowed displacement
(`pushPos`/`velAt` family, motion.v1), signed along an EMA'd wind axis.

```
IDLE → WIND (amp AND speed gates) → predictReversal (decel-gated, ≤100 ms
extrapolation) → REVERSAL (confirm/cancel window) → commit → CAST (refractory)
```

Load-bearing details, each pinned by a measured failure:

1. **Gate the zero-cross on deceleration.** `predictReversal` refuses a
   crossing whose braking is below `minDecel` (2.8 pu/s²). Body sway
   (±0.3 pu, 0.4 Hz) turns at ω²A ≈ 1.9; the gentlest ladder throw brakes at
   ≈ 4. Without this the fast path bypasses the decel floor and sway commits
   156×/48 runs; with it the ancillary battery is silent.
2. **Confirm-window expiry commits only at the noise floor.** At expiry the
   arm either turned (v ≤ windRelaxSpeed → commit: the smooth heave's slow
   turn) or the predict was jitter (v still above it → cancel, rebuild).
   Committing below `cancelSpeed` instead misfires mid-wind: a 0.6 pu/s
   throw spends most of its backswing under any usable cancel threshold.
3. **Keep the coast decel estimate live from the first gated frame.** On
   dropout the constant-deceleration model extrapolates the zero-cross inside
   the gap and commits from the pre-blur snapshot — but only if the decel
   estimate was updated every WIND frame, not first captured at predict time
   (dropout at the reversal usually begins BEFORE prediction fires).
4. **Non-finite samples are dropout, not positions.** A single
   Infinity/NaN coordinate (seen live: layout-transient normalization)
   silently poisons every downstream max/compare; coerce to a dropout frame
   before any state touches it.
5. **Bound the wind window** (~6 s). Sustained never-reversing motion must
   not grow the kinematics window or its O(n) resample cost unboundedly.

## Recoverability map (Phase 0, 2026-07-18 — synthetic, PROVISIONAL)

Grid: amplitude {0.15, 0.3, 0.45, 0.6} pu × peak speed {0.6, 1.2, 2.2, 3.5}
pu/s × launch angle {0°, 25°, 50°} × fps {25, 30, 60}, σ {0.003, 0.005},
4 seeds, dropout {none, 2 @reversal, 4 @reversal, 3 @peak-speed}. Event
recovery = exactly one commit within [-150, +150] ms; full grid:
`site/handysynth/skipping-stone/spike/reversal-fixture.json` (Pyrefey repo,
branch `feat/skipping-stone-v0.1b`).

| region | verdict |
|---|---|
| amp 0.3–0.45, speed 0.6–2.2, 25–30 fps | **A** — observed zero-cross + stable kinematics, 91–100% |
| amp ≥ 0.45, speed 3.5 | **B** — predicted path 100%; commit rides prediction/coast |
| amp 0.3, speed 3.5, 25–30 fps | degraded (34–56%): an ~86 ms backswing is 2–3 frames — below observability |
| amp 0.15 row, 25–30 fps | 41–50%: rides the `minAmplitude` gate boundary given the −13…−17% amplitude bias (below) |
| dropout severity (pooled) | none 86% · rev2 82% · rev4 68% · peak3 49% — mid-swing blur starves the gates more than reversal-frame loss does |

Measured boundaries worth reusing:

- **Commit latency is deterministic, not jittery.** Median +67…71 ms at
  25–30 fps (p90 ≈ 100), +27 ms at 60 fps; anticipation lands slow lobs up to
  100 ms early. A throw metaphor absorbs the residual diegetically — the
  stone's flight to first splash IS the latency budget (§L).
- **Kinematic bias is systematic, stability is what matters.** Amplitude
  reads −13…−17% (WIND-entry truncation of the slow early backswing), speed
  ≈ 0% at 30 fps; cross-seed CV ≤ 0.12 in every A/B cell. Map consumers must
  normalize against camera-rate references, never ground truth
  (→ see: [[camera-sampled-impulse]] — same doctrine, event-level).
- **The reliable speed ceiling scales with backswing duration.** ≈ 2.2 pu/s
  at amp ≤ 0.3, ≈ 3.5 pu/s at amp ≥ 0.45 (30 fps): the detector needs
  ~5 frames of backswing. Faster-smaller flicks lose the event (honest
  silence), never emit garbage — Tier-2 saturation is inherent.
- **The sway boundary is an amplitude, not a gesture class.** ±0.08 pu stays
  silent (48/48 runs); ±0.15 begins to answer; ±0.30 answers robustly.
  Extends camera-sampled-impulse's tremble finding one scale up: the §K
  ancillary budget gates body English, and deliberate large oscillation
  honestly answers as gentle throws.

## Caveat: synthetic-only (2026-07-18)

No human threw at a camera this session (Slingtone/Thermal protocol). The
jitter/dropout model cannot represent blur-CORRUPTED landmark positions —
only loss — which is precisely why **Mode B** (commit from the pre-blur
predicted snapshot) is selected over Mode A despite identical synthetic
rates: it hedges the failure the synthetic map cannot measure. Live rows
(real σ, felt latency, real flick ceiling, live sway boundary) are
deliberately unfilled; `site/handysynth/skipping-stone/spike/probe.html`
runs the production detector self-serve and logs every event with
kinematics, lead time, and measured fps. Gate decision marked provisional
pending the felt play-test.

## Relationship

- **Event-level sibling of [[camera-sampled-impulse]]:** that concern
  delivers sustained ballistic energy into a sim; this one commits a single
  impulsive instant. Same degradation model, same two-smoothing-budgets rule,
  same synthetic-then-probe protocol; both find cursor-tuned smoothing and
  ground-truth-calibrated thresholds to be the recurring traps.
- **Consumes [[velocity-from-history]]** (windowed displacement velocity) as
  the detector's only smoothing, per the two-budget rule.
- **Anticipatory-trigger family (§L):** the predict/confirm/cancel shape
  generalizes to any impulsive vocabulary hiding camera latency (pinch
  lookahead, drum backswing, draw-and-loose).
