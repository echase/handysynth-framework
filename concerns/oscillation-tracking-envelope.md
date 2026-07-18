---
id: oscillation-tracking-envelope
intent: Map where camera-sampled hand oscillation (flutter/tremolo, ~1–10 Hz) is readable from MediaPipe landmark streams — per-cycle reversals vs band-energy-only vs collapse — and codify the sampling/smoothing constraints every high-frequency variant inherits
why: Vigorous shaking is precisely where MediaPipe degrades (motion blur, dropout), and the readable band is set as much by FRAME CADENCE as by the tracker — a 30 fps stream mis-reads a 6 Hz shake by up to 24% through pure grid quantization, and merges ~25% of reversals at 8 Hz. Any variant pricing musical response on tremble rate, strike train, or oscillation phase needs this envelope answered once, here, not per variant.
acceptance: "Synthetic: known-frequency fixtures through the effort-curves v0.2.1 `OscillationDetector` recover rate within 10% at 60 fps (25% bound at rigid 30 fps), strike counts within 25% below 8 Hz, drift never classifies in-band. Live: the amplitude × frequency grid (1–10 Hz × small/medium/large) is walked by a real hand and each cell carries a per-cycle / energy-only / collapsed verdict with dropout + teleport rates."
detection: A variant driving audio from oscillation rate/reversals without a grain/energy fallback above ~6 Hz, or decimating detection below camera-native cadence, or reading detector amp as physical amplitude = needs this map.
applicability: Variants pricing sound on measured oscillation (tremolo-garden; future drumspace rolls, crystal-harp tremolo, lumora dye-scrub, sway-clock work). N/A for all 18 current board variants — none reads oscillation rate today.
status:
  tremolo-garden: applied@v0.1b (synthetic evidence; the LIVE grid below is UNFILLED pending the felt play-test)
---

## Provenance

Phase 0 spike output for Tremolo Garden v0.1b (2026-07-18), the catalog's
first iterative-excitation variant. Runner:
`site/handysynth/tremolo-garden/spike/tremolo-spike.mjs` (Pyrefey repo, branch
`feat/tremolo-garden-v0.1b`); live probe:
`site/handysynth/tremolo-garden/spike/probe.html`.

**No operator hand was available this session, and this gate is unusually
camera-bound: synthetic fixtures cannot exhibit MediaPipe motion blur.** Per
the Slingtone protocol the mode decision (Mode A) rides the synthetic
scorecard (31/31) plus a partial real-Chrome boot check; the live grid below
ships explicitly unfilled. The probe is self-serve — auto-bins each 5 s
capture into the grid by measured rate and amplitude, exports results JSON —
so the session with a hand at the camera fills it without re-deriving
anything.

## The envelope (amplitude × frequency grid)

Verdicts: **per-cycle** (reversal train usable as a strike train) ·
**energy-only** (band energy usable, strikes fray) · **collapsed** (tracking
unusable).

| | 1–3 Hz | 3–4 Hz | 4–5 Hz | 5–6 Hz | 6–7 Hz | 7–8 Hz | 8–10 Hz |
|---|---|---|---|---|---|---|---|
| small | – | s: per-cycle | s: per-cycle | s: per-cycle | s: per-cycle | s: per-cycle | s: energy-only |
| medium | – | s: per-cycle | s: per-cycle | s: per-cycle | s: per-cycle | s: per-cycle | s: energy-only |
| large | – | s: per-cycle | s: per-cycle | s: per-cycle | s: per-cycle | s: per-cycle | s: energy-only |

`s:` = synthetic-only (jittered 25–30 fps fixtures + positional noise through
the full stack — no MediaPipe in the loop). **Every cell needs its live
verdict**; motion blur is expected to pull the large-amplitude / high-rate
corner toward energy-only or collapsed. 1–3 Hz is sub-band by design
(slow-drift rung). The 8–10 Hz synthetic verdict is already energy-only from
sampling alone (see finding 2) — live can only be worse.

## Findings (synthetic, but platform-truth)

1. **Frame-grid rate quantization.** The detector's median-half-period
   estimate snaps to frame-interval multiples. At a rigid 30 fps grid a 6 Hz
   oscillation reads 7.46 Hz (+24%); with realistic timestamp jitter ~6.7 Hz
   (+11%). At 60 fps error is ≤2.4% across 4–8 Hz. Run detection at
   camera-native/rAF cadence — never decimate — and treat 30 fps rate
   readouts as ±25%.
2. **Strike attrition above ~6 Hz at 30 fps.** 8 Hz gives 3.75 samples per
   half-swing pair; ~25% of reversals merge (36/48 detected). This is the
   sampling-theory floor for per-cycle excitation and independently justifies
   the ~6 Hz strike→grain crossfade (the ear stops hearing discrete strikes
   there anyway).
3. **Detector amp is EMA-attenuated, not physical.** The internal EMA
   (α = 0.5) scales measured amplitude by ~0.58× at 5 Hz/30 fps, ~0.47× at
   7 Hz. Calibrate intensity gains against MEASURED amp (tremolo-garden ships
   `intensityGain` 4.5), and never compare detector amp across frame rates.
4. **Deactivation latency is 1000/minHz** (≈286 ms at the 3.5 Hz floor) — the
   reversal-recency guard, not `windowMs`, sets it. Release classification
   must ride a separate fast envelope: with a 30/80 ms attack/release EMA a
   true dead stop measures ~167 ms (80%→20% fall) vs ~600 ms for the slowest
   natural trail-off — boundary at 250 ms separates them cleanly.
5. **Dropout coast:** one band-floor period (~280 ms) of coasting bridges
   real tracking flickers; longer gaps must force a release (no stuck rolls).
   Synthetic: 200 ms gap coasts clean, 700 ms gap forces exactly one release.
6. **Keep One-Euro OFF the detection path entirely** (corrected 2026-07-18,
   same build: the original guidance here recommended minCutoff ≥ 2.0 /
   beta ≥ 0.2 upstream of the detector, and the tremolo-garden sim pass
   disproved it — a 2 Hz cutoff passes ~27% of a 7 Hz tremble, dropping a
   real flutter below `minAmp`). Feed the detector the RAW tracked point:
   its internal EMA plus the minAmp/minSwing floors are the jitter defense.
   One-Euro (motion pin) smooths only the SELECTION path, where stability
   matters and band loss is irrelevant. This is
   [camera-sampled-impulse](camera-sampled-impulse.md)'s "smoothing
   separates jitter only" finding, extended: for oscillation reading, any
   usable smoothing is band-destructive.
7. **Palm centroid** (mean of landmarks {0, 5, 9, 13, 17}) is the
   dropout-robust tracked point; per-axis detectors with live-axis-by-amp
   selection worked on every synthetic fixture including noisy 25 fps.
8. **Tooling note:** Playwright-driven Chromium on this machine hangs in
   `getUserMedia` until macOS grants it camera access (TCC) — the fake-device
   flags did not bypass it. First live probe run needs one manual OS-level
   camera approval.

## Recommended per-variant bands

| Use | Band | Excitation read |
|---|---|---|
| Tremolo/flutter (tremolo-garden) | 3.5–9 Hz, strike→grain crossfade ~6 Hz | per-cycle to ~6 Hz, energy above |
| Roll/tremolo ornaments (drumspace, crystal-harp) | 4–8 Hz | energy-only is sufficient |
| Wave/sway (Tier 2 metaphors, sway-clock) | 1–3 Hz | per-cycle is easy; rate × multiplier |

## Upstream patch shape (recorded, NOT executed this release)

`effort-curves.js` `OscillationDetector` v0.3 candidates, proven variant-side
in `tremolo-core.mjs` v0.1.0: per-reversal strike events with half-swing
amplitude (`ReversalEmitter`), band-energy envelope (`BandEnergy`), per-hand
phase from the reversal train (`HandPhase` + `phaseAlignment`). Promote on the
rule of three (drumspace rolls / crystal-harp tremolo would be consumers 2–3).
Logged in [CANDIDATES.md](CANDIDATES.md).
