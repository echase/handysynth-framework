# Lumini — Changelog

## v0.4.1 — 2026-07-11

Fix: FBO/texture leak on every canvas resize. `initFramebuffers()` recreated
`divergence`/`curl`/`pressure`/`mcVelTemp` and `initBloomFramebuffers()` /
`initSunraysFramebuffers()` recreated `bloom`/`bloomFramebuffers[]`/`sunrays`/
`sunraysTemp` via `createFBO`/`createDoubleFBO` with no disposal of the
previous GPU resources; `resizeFBO`/`resizeDoubleFBO` (the dye/velocity path)
had the same gap for the outgoing FBO and the double-buffer's `write` slot.
All six now call `disposeFBO` on the outgoing resource before replacing it
(guarded for the first-init case where nothing exists yet).

Fix: `destroy()` calling `loseContext()` fired `webglcontextlost`, which the
host's `onContextLost` callback treated as an unrecoverable GPU crash rather
than the intentional teardown it was. `destroy()` now nulls `onContextLost`
and removes this module's `webglcontextlost` listener before calling
`loseContext()`, so intentional teardown is silent.

## v0.4.0 — 2026-07-11

Circular containment: `setContainment({x, y, r, feather?})` (screen-space,
height-fraction radius; also a mount opt) confines the fluid to an analytic
circular vessel — slip-wall velocity pass after projection (outward component
removed in a feather band, tangential preserved, strictly-outside hard-damped) +
display rim mask on dye. Pure math exported (`circleSDF`, `containVelocity`) and
mirrored by `containShader`; the slip-wall boundary is `d > 0` (rim itself slips)
in both. Null/omitted ⇒ v0.3.0-identical. Known limits: pressure solve stays
rectangular (wall is enforced per-frame re-projection, not in the Poisson step —
visually correct, not physically exact); dye splatted outside the circle is
masked, not simulated away.

## v0.3.0 — 2026-07-11

Per-splat radius: `splat(x, y, dx, dy, color, radius?)` — optional override in
SPLAT_RADIUS preset units via `resolveSplatRadius(radius, fallback)`; omitted ⇒
preset value (v0.2.0-identical). Shared task with the TuneFlow plan.

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
