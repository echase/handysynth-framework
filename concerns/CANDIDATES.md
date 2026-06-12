# Cross-Pollination Candidates — backlog

**Version:** 1.0
**Date:** 2026-06-04
**Status:** Active backlog (Tier S promoted to concern files; Tier A/B awaiting promotion)
**Scope:** Features and lessons surfaced by a 5-cluster parallel scan of all variants + git history, ranked for cross-variant adoption. Un-promoted rows live here until they become `concerns/<id>.md`.

→ see: [README.md](README.md) · [STATUS.md](STATUS.md) · [ARCHITECTURE.md](../ARCHITECTURE.md) · [VARIANT-POLISH.md](../VARIANT-POLISH.md)

---

## Ranking basis

Breadth × impact ÷ effort, with a bonus for **convergent reinvention** — when several variants independently
built the same thing, that is the strongest signal it belongs in the shared baseline.

## Tier S — promoted to concern files (do first)

| Candidate | Concern file | Source → breadth | Effort | Kind |
|-----------|--------------|------------------|--------|------|
| One-Euro adaptive smoothing | [one-euro-smoothing](one-euro-smoothing.md) | finger-guns → all | low | upgrade to POLISH #1 |
| Velocity-from-history helper | [velocity-from-history](velocity-from-history.md) | augury/pulse/conductor → all gesture | low | upgrade to POLISH #10 |
| Swap-and-pop particle arrays | [swap-and-pop-particles](swap-and-pop-particles.md) | augury → all particle variants | low | perf hygiene |
| Two-hand role stability | [two-hand-role-stability](two-hand-role-stability.md) | air-guitar → all two-hand variants | med | **bug/lesson** |

## Tier A — cluster-wide, awaiting promotion

| # | Candidate | Source → transfers to | Effort |
|---|-----------|----------------------|--------|
| A1 | Depth / Z-axis as a 3rd expression axis (lean in/out) | crystal-harp, drift → continuous-pitch variants | low |
| A2 | Hand-openness / curl as a dynamics axis (decouple volume from Y) | syrinx, drift, stellar-conductor → most | low |
| A3 | Glide / portamento + quantize toggle | syrinx → theremin, crystal-harp, drift | low |
| A4 | Additive particle render + radial-gradient glow halos | pulse, lumen, fireflies → visual variants | low–med |
| A5 | Reverb: early reflections + stereo diffusion, no convolver file | augury, synesthesia → any | med |
| A6 | Effort-curve features (energy/stillness/onsets) as expression axes | foundation `effort-curves.js` (from embra) → all gesture variants | low |

## Tier B — bigger bets (high ceiling, defer-with-trigger candidates)

| # | Candidate | Source | Note |
|---|-----------|--------|------|
| B1 | Per-finger scale-degree chord offsets | crystal-harp | musical feature, melodic variants |
| B2 | Parametric voice class (FM "species" pattern) | augury | timbre variety without N engines |
| B3 | Musicality scoring (consonance/rhythm/dynamics feedback) | runecatch | strong differentiator, high effort |
| B4 | Screen-shake + border-glow impact feedback | finger-guns | percussion/impact variants |
| B5 | relationshipFrame: two-body relational features (distance, mirroring, near-touch, shared stillness) above paired BodyStates | future two-player embra mode — relational layer sits above individual BodyState objects, never inside pose tracking | medium |

## Promote to core (`handysynth.js`) — not per-variant patches

| Candidate | Source | Note |
|-----------|--------|------|
| Pose-landmarker fusion (elbow/arm anchoring) | finger-guns, **embra** | optional `PoseLandmarker` alongside `HandLandmarker`; embra is the full-body reference implementation (isolated try/catch, lite model, anatomical identity); land once in core, variants opt in |
| (One-Euro smoothing, velocity-from-history) | — | could centralize in core instead of patch-and-track, if preferred over per-variant adoption |

## Caveats

- Source line numbers came from agent scans; the sweep **re-validates presence** before any patch (the
  matrix is a hint, not truth).
- Tier-B items are heavy — expected to be `deferred` with a revisit-trigger, not done now.
- This backlog is the input to promotion: when a candidate is promoted, move its row reference to the Tier-S
  table and create `concerns/<id>.md`.
