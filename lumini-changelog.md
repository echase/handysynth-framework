# Lumini — Changelog

## v0.2.0 — 2026-07-10

Sound-gated medium retune (spec `2026-07-10-lumini-musical-dynamics-design`).
Breaking: splat momentum recalibrated — u/s velocities were landing ~60× hot
against SPLAT_FORCE's per-frame-delta tuning.

- `VEL_TO_DELTA` (1/60) + `splatMomentum()`: velocity (units/sec) converts to
  the per-frame-delta convention `SPLAT_FORCE` was calibrated for (Lumora parity).
- Energy hub remapped (`hubConfig`): `CURL = base + grit·8 + energy·30`,
  `BLOOM_INTENSITY = base + energy·0.65`; dissipation now constant — audio
  injects, the fluid owns its decay. New `grit` input (0–1, drive baseline).
- Asymmetric energy envelope: ~30 ms attack / ~250 ms release
  (`smoothEnergy(prev, target, attack, release)`; 3-arg calls unchanged).
- Presets: classic CURL 30→8, BLOOM_INTENSITY 0.8→0.35,
  VELOCITY_DISSIPATION 0.25→0.28; ember CURL 18→6, BLOOM_INTENSITY 0.8→0.35.
- R16 idle breathing retuned to barely-perceptible (embers under glass).

## v0.1.0 — 2026-07-07

First release. Bare-bones WebGL fluid feedback extracted from Lumora v0.35b
(Pavel Dobryakov WebGL-Fluid-Simulation, MIT); MacCormack advection dropped.

- Input-agnostic `Lumini.mount(container, {preset, layer, idleAfter})` →
  screen-space `splat(x, y, dx, dy, color)`, `energy`, `config`, `simMs`,
  `pause`/`resume`/`destroy`, `onContextLost`.
- Recipes: R1 wake trails, R5 loudness turbulence, R16 idle breathing built
  in / demoed; R2 pluck bursts + R3 sustain bleed are host-side (see spec).
- Presets `classic` / `ember` (mobile-safe). `OneEuro` promoted to foundation.
- Demo/tuning rig: `lumini-demo.html` (also the mouse-tracker showcase).
