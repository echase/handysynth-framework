# Lumini — Changelog

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
