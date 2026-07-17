---
id: flap-fidelity
intent: Establish where full-body bilateral flap detection (antiphase wrist-Y over a stable torso) is reliable, and codify the synchrony gate as the flap-vs-reposition arbiter
why: Thermal prices altitude in flaps — a reposition that banks false altitude breaks the instrument's whole stamina economics. Every future body-scale periodic-gesture variant (Sway, Tremolo Garden) needs the same discrimination, so the evidence lives here, not in the variant.
acceptance: All four false-positive classes (both-together, torso-translate, one-arm, whole-body sway) yield zero strokes; in-band antiphase flaps (0.8–3.0 Hz) detect ≥85% of downstrokes with amplitude within 15%; survives 25 fps + 0.03 SW jitter.
detection: Search for `FlapDetector` / `antiphaseTol` / `bothTogetherVeto`. Absent in a periodic-gesture variant = unprotected against reposition lift.
applicability: Variants driven by repeated bilateral body oscillation (thermal, sway, tremolo-garden). N/A for hand-scale instruments.
status:
  thermal: applied@v0.1b (synthetic evidence; live rows provisional pending felt play-test)
---

## Provenance

Phase 0 spike output for Thermal v0.1b (2026-07-17). Runner:
`site/handysynth/thermal/spike/thermal-spike.mjs`; live probe:
`site/handysynth/thermal/spike/probe.html`. No human was at the camera this
session — per the Slingtone protocol the mode decision rides the synthetic
evidence and the live rows below are **provisional pending the felt play-test**.

## Gate decision

**Mode A — full wingspan** (flap = antiphase wrist-Y, bank = shoulder line,
wingspan modulates lift). Grounds:

- The load-bearing risk was discrimination, not visibility — and the
  discrimination evidence is synthetic-complete (table below).
- Wrist visibility at room distance is Embra-proven on the identical stack
  (tasks-vision 0.10.18, `pose_landmarker_lite` float16, GPU, `numPoses: 1`).
- Mode B (elbow strokes) and Tier 2 (desk hands) remain one-constant swaps
  (`FLAP_MODE`); the flight model, audio, and visuals are mode-agnostic.

## Synchrony-gate robustness (synthetic, 16/16 fixtures)

Detection across the band, 30 fps unless noted:

| Fixture | Injected | Detected | Amp fidelity | Notes |
|---|---|---|---|---|
| flap 0.8 Hz | 13 | 11 (85%) | 0.599 vs 0.6 | misses = warm-up only |
| flap 1.6 Hz | 26 | 23 (88%) | 0.597 vs 0.6 | |
| flap 3.0 Hz | 48 | 46 (96%) | 0.571 vs 0.6 | |
| flap 25 fps + 0.03 SW jitter | 26 | 23 | 0.605 | locks fine |
| flap + 0.05 SW jitter | 26 | 20 | 0.609 | antiphase gate sheds 3 |

False positives — **all zero**, and each dies on the *intended* gate:

| Fixture | Strokes | Rejecting gate |
|---|---|---|
| both arms together | 0 | correlation (> −0.3) |
| torso translation | 0 | amplitude (arms ride, no swing) |
| one-arm oscillation | 0 | in-band (other wrist silent) |
| whole-body sway | 0 | in-band + torso speed |
| near-synchronous (offset 0.1) | 0 | correlation |
| sub-amplitude (0.2 SW) | 0 | swing floor (`minAmpSW`) |
| flap superimposed on sway | 0 | torso-speed veto |

Stroke timing: reported extremum times align with injected downstroke extrema
within ±1 frame (raw-trace extremum timestamps; detection itself lags ~2–3
frames — inside the §L iterative-gesture tolerance). Sharpness ordering
preserved (sharp-2.5 stream measures 2.23 vs 1.56 for sine).

## Visibility by distance

| Distance | wrists | elbows | shoulders | Evidence |
|---|---|---|---|---|
| room (~2–3 m) | expected stable | expected stable | expected stable | Embra precedent, same config — **live row pending** |
| desk (~0.6 m) | torso clipped likely | partial | stable | **live row pending** |

The probe overlays per-landmark visibility EMAs, stroke events, torso speed,
and per-gate reject counters — fill these rows at the play-test (room vs desk,
on-axis and ±30°).

## Degradation notes

- One arm out of frame → other detector goes silent → in-band gate holds all
  strokes (no false lift); host trims to glide.
- Self-occlusion at stroke top: brief visibility dips ride the One-Euro
  filters; a fully lost extremum costs one stroke, never adds one.
- Torso clipped close-in: torso-centroid speed gate degrades — desk distance
  is Tier 2 territory by design.
- Body lost > 1.5 s → neutral re-capture on re-acquire (a re-entered body is
  never mid-flap by accident).

## Load-bearing implementation findings

- The verbatim `OscillationDetector` (effort-curves.js v0.2.1) is the
  sustained-activity authority (`active` flag, flutter/§K) but **not a
  stroke-path veto**: its 2500 ms mixed-window convergence is slower than the
  designed 3-flap cruise burst, and landmark jitter keeps its internal EMA
  reversing during stillness, so post-transition estimates are live-but-wrong
  for up to ~2.5 s. Stroke-path in-band enforcement needs its own fresh-extrema
  tracker (2 spans, both wrists, band-margined).
- Rhythm confirmation costs ~1.5 cycles per burst. Downstrokes thrown during
  confirmation that already pass the hard gates (swing floor, antiphase
  correlation, still torso) are credited to the first confirmed stroke
  (`stroke.count`, capped +3) so short honest bursts pay — lift only, one
  audio accent (§D congruence intact).
- `kLift` re-solved empirically in the closed loop (0.052, from 0.055):
  ~4 confirmed strokes + 1 credit per 3-flap burst balances a 12 s sink.

## Recommended One-Euro settings

| Signal | minCutoff | beta | dCutoff |
|---|---|---|---|
| derived signals (bank, wingspan, torso centroid, dive lean) | 1.2 | 0.012 | 1.0 |
| wrist-Y traces feeding the flap detector | 2.0 | 0.012 | 1.0 |

The lighter wrist filter preserves stroke sharpness; measure stroke *swing* on
the raw trace between filtered-detected extrema (filtering attenuates a 1.6 Hz
sinusoid ~20% — enough to break amplitude fidelity if measured post-filter).
