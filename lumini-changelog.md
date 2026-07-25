# Lumini — Changelog

## v0.5.0 — 2026-07-25

Upstreams the pulling-cliff v0.12b field fork (a locally-modified inlined
v0.2.0 copy) as opt-in `Lumini.mount()` options. All default to v0.4.1-
identical behavior — nothing changes for an existing caller that passes none
of them.

- `opts.opacity` (0..1, default `1`): sets the fluid canvas's CSS opacity so
  a host can keep UI overlays legible on top of it.
- `opts.heatRampCap` (default `1`, uncapped): new 2nd arg on `heatColor(t,
  heatRampCap)` — scales the ramp's top end down from hot near-white toward
  a deep violet. The field fork ran `0.55`.
- `opts.idleEmitters` (default `3`): trims the R16 idle-breathing seed pool.
  New pure exports `STOCK_IDLE_EMITTERS` (the 3 stock Lissajous seeds) and
  `resolveIdleEmitters(count, pool)` back it; the per-tick math is now its
  own pure `idleEmitterTick(seed, idleFade, gain?, heatMax?)`, extracted from
  the `mount()` loop so the field fork's softened single-emitter motion
  (gain 0.18/0.15 → 0.07/0.06, heat cap 0.15 → 0.10) is testable without a
  GL context.
- `opts.hubScale` (default `1`): new 5th arg on `hubConfig(energy, grit,
  baseCurl, baseBloom, hubScale)` — multiplies the energy/grit contribution
  only (`baseCurl`/`baseBloom` pass through untouched). The field fork ran
  its hub response roughly halved; `hubScale: 0.5` is the clean upstream
  equivalent (the field fork's actual hand-tuned constants — grit·5,
  energy·14, bloom+0.28 — don't factor into a single scalar off the v0.4.1
  numbers, so this reconciles the documented intent rather than the exact
  arbitrary values).
- New `mellow` preset: softened `classic` GL config (`SPLAT_FORCE` 4500,
  `BLOOM_THRESHOLD` 0.7, matching the field fork) plus `heatRampCap: 0.55`,
  `hubScale: 0.5`, `idleEmitters: 1` with its own seed/gain/heat fields.
  Composes with the existing preset mechanism — `preset: 'mellow'` sets all
  of the above, and any matching top-level mount opt still overrides it.
- `classic`/`ember` are unchanged and carry none of the new fields, so
  `mount()`'s `opts.KNOB ?? preset.KNOB ?? hardDefault` fallback chain
  reaches the v0.4.1 hard default whenever a preset doesn't opt in.

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
