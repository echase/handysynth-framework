---
id: limb-isolation
intent: Establish where per-limb motion isolation ("this wrist moved and its elbow didn't") is readable from PoseLandmarker streams, and codify the coupling-ratio + shaped-knee scoring that separates intent from the coupling every real body has
why: Marionette prices its whole skill on isolation — if the score false-muds on ordinary incidental coupling, the central skill is unplayable. Every future per-limb full-body variant (and the eventual effort-curves isolation promotion) needs this map, so the evidence lives here, not in the variant.
acceptance: Ordinary incidental coupling (neighbor at ≤0.2× the limb's displacement, 1% torso landmark jitter superimposed) scores above isoKnee on every frame of a pull (false-mud rate 0); a deliberate whole-arm drag (neighbor ≥0.7×) shapes ≤0.18 brightness; separation margin (isolated − coupled median ratio) > 0.25; zero tooth double-fires through One-Euro + deadband.
detection: Search for `isolationRatio` / `isoShape` / `isoKnee` / `speedFloor`. A per-limb variant modulating timbre by cross-limb coupling without a shaped knee and a noise speed-floor is exposed to false mud.
applicability: Variants scoring per-limb motion independence (marionette; future per-limb full-body variants; the deferred effort-curves isolation-helper promotion this doc seeds). N/A for hand-scale instruments and whole-body-aggregate variants (embra).
status:
  marionette: applied@v0.1b (synthetic evidence; live rows provisional pending felt play-test)
---

## Provenance

Phase 0 spike output for Marionette v0.1b (2026-07-18). Runner:
`site/handysynth/marionette/spike/iso-spike.mjs`; live probe:
`site/handysynth/marionette/spike/probe.html` (**self-serve** — Between
precedent: labeled-sample buttons + `MARIONETTE-PROBE-V1` clipboard/download
export, so a solo camera session fills the live rows without a build
session). No human was at the camera this session — per the Slingtone
protocol the mode decision rides the synthetic evidence and the live rows
below ship **deliberately unfilled, provisional pending the felt play-test**.

## Gate decision

**Mode A — five strings** (both wrists, both elbows, head), PROVISIONAL. Grounds:

- The load-bearing risk was scoring, not visibility — and the scoring
  evidence is synthetic-complete (scorecard below): isolation separates
  intent from incidental coupling on all five limbs with margin.
- Wrist/nose visibility at room distance is Embra-proven on the identical
  stack (tasks-vision 0.10.18, `pose_landmarker_lite` float16, GPU,
  `numPoses: 1`). **Elbow tracking quality at room distance is the one
  claim synthetic evidence cannot carry** — it is exactly what the probe's
  per-limb visibility % and jitter-σ columns measure.
- Mode B (wrists + head) and Tier 2 (wrists, desk framing) remain
  one-constant swaps (`MODE`); the string model, ratchet engine, slump, and
  visuals are mode-agnostic.

## The scoring recipe (what transfers)

```
ratio(limb) = v(limb) / (v(limb) + Σ w·v(neighbor) + isoEps)
iso(limb)   = smoothstep((ratio − isoKnee)/(1 − isoKnee)) ^ isoGamma
```

- **Neighbors are anatomical, symmetric:** wrist ↔ same-side elbow (w 1.0);
  head ↔ both wrists (w 0.4). Strings/roles bind to landmark indices — the
  two-hand handedness-label problem never arises.
- **Speeds need two defenses before the ratio** (both spike-derived, both
  transferable):
  1. `isoWindowMs 200` — iso speeds come from a **wider** velocity window
     than note-attack velocity (90 ms). Zero-mean landmark noise cancels
     over 200 ms while real limb motion accumulates; at 90 ms, 1% torso
     jitter on a *neighbor* reads as speed comparable to a small-span limb's
     genuine motion (head span 0.22×torso) and mudded 17% of head-pull
     frames.
  2. `speedFloor 0.08` torso-units/s subtracted from every speed — ~1% torso
     jitter at 30 fps reads at or under this. Without it the denominator
     inherits noise even in the wide window.
- **Tension is body-relative** (limb height measured against the
  mid-shoulder anchor), so whole-body translation — ancillary sway, a step
  toward the camera — cancels structurally instead of relying on thresholds.
- **The score modulates, never gates:** brightness floors at `brightFloor`
  (gain 0.55 / 1.2 kHz). Noise cannot manufacture a false error, only a
  duller pull.

## Synthetic scorecard (iso-spike.mjs, 18/18 PASS, 2026-07-18)

| Check | Result | Expect |
|---|---|---|
| false-mud rate, each of 5 limbs (coupling 0.12 + 1% jitter) | 0.000 ×5 | 0 |
| isolated median iso ratio (lwrist) | 0.929 | > 0.65 |
| deliberately coupled median ratio (0.85 drag) | 0.542 | < iso − 0.2 |
| separation margin (raw) | 0.387 | > 0.25 |
| isolated / coupled median shaped iso | 0.911 / 0.019 | > 0.5 / < 0.2 |
| tooth double-fires, jitter parked on all 6 boundaries, 5 s each | 0 | 0 |
| teeth fired by rest jitter (whole engine) | 0 | 0 |
| slump false positives (sway / pulls / brief dip) | 0 / 0 / 0 | 0 |
| sighs in the full slump arc; recovery order | 1; lift order | 1; lift order |

## The empirical coupling curve (synthetic bodies)

Median iso ratio vs neighbor-coupling fraction (lwrist, 1% jitter,
noise-floored speeds): 0.05→0.992 · 0.10→0.960 · 0.15→0.919 · 0.20→0.879 ·
0.25→0.842 · 0.30→0.807 · 0.40→0.741 · 0.50→0.685 · 0.60→0.634 · 0.70→0.589 ·
0.85→0.538 · 1.00→0.496.

**Admissible `isoKnee` band [0.325, 0.615]** (bright constraint: incidental
≤0.2 shapes ≥0.65; dull constraint: deliberate ≥0.7 shapes ≤0.18), midpoint
0.470 → **default 0.45 confirmed in-band, unrevised.** Live bodies will sit
differently — the probe recomputes `measuredKnee` from labeled samples.

## Readable-isolation map — LIVE ROWS (deliberately unfilled)

Fill from a `MARIONETTE-PROBE-V1` export (probe protocol: desk AND room
distance, mirror ON and OFF, ≥3 isolated + ≥3 coupled marks per limb per
distance, include edge-on/self-occluded poses):

| Landmark | Desk: vis% / jitter σ | Room: vis% / jitter σ | Iso separates at desk | Iso separates at room | Notes |
|---|---|---|---|---|---|
| lwrist (15) | — | — | — | — | |
| rwrist (16) | — | — | — | — | |
| lelbow (13) | — | — | — | — | **Mode A/B separator** |
| relbow (14) | — | — | — | — | **Mode A/B separator** |
| head/nose (0) | — | — | — | — | |

Measured live coupling knee: — (probe `measuredKnee.midpoint`) ·
Recommended One-Euro on tension: 1.0 / 0.007 / 1.0 (defaults; revise from
probe feel) · Mirror-convention asymmetries: —

## Deferrals

- **Promotion into effort-curves / a shared helper** — seeded here, not
  executed (plan law). Revisit-trigger: a second per-limb variant adopts the
  recipe, or the effort-curves v0.3 planning window opens.
- **Live-row fill** — waiting on a solo camera session with the self-serve
  probe; paste the export back and a `confirmed-live` amendment (one
  foundation commit) finalizes the gate.
