# lars-engine — Changelog

## v1.0.0 — 2026-07-16

Initial release for Pulling Cliff v0.14b ("Lars Walks In", spec
`docs/pulling-cliff-lars-walks-in-2026-07-16-spec.md`): 16-step pattern bank
(4 intensity tiers + small/run/entry/exit fills, phrase-head crashes),
grid math, intensity follower (EMA τ 2.5s), sticky tier mapping (±0.08
hysteresis), leaky arming accumulator (40s target, 0.5× drain), humanize
(±2/4ms, 15% velocity spread), and the LarsBrain lifecycle state machine
(off → arming → countin → in → exitfill; tick/onBar split so every audible
transition lands on a bar boundary).
