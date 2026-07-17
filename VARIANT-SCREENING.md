# Variant Screening Standard

**Version:** 1.0
**Date:** 2026-06-03
**Status:** Active
**Scope:** Pre-pipeline screening for variants landing in `drop/`

---

## Purpose

When a variant lands in `drop/`, screen it **before** running the move/generate pipeline. Screening produces a short report that names correctness blockers, scores polish coverage, surfaces metadata gaps, and ends in a ranked list of suggested updates — so refinements can be offered the moment a variant arrives.

Screening verifies; it does not auto-fix. Tier 1 blocks the pipeline. Tiers 2–3 are surfaced for the operator to direct.

Pairs with [VARIANT-POLISH.md](VARIANT-POLISH.md) (the 16-item standard) and the catalog pipeline spec (`pyrefey-deploy/docs/superpowers/specs/2026-05-28-handysynth-catalog-design.md`).

---

## How to Use

1. Run the three tiers against the landed `index.html` + `about-variant.md`.
2. Score each item: **pass** / **adapted** / **missing** / **N-A** (Tier 2 only). Adapted and N-A each get a one-line reason.
3. Write the screening report (see last section). Lead with Tier-1 blockers.
4. Hand the report to the operator. Do not move or generate until Tier-1 is clean.

---

## Tier 1 — Correctness Gates

A failure here means the variant is broken on some device. **Blocks the pipeline.**

| # | Check | Why it matters |
|---|-------|----------------|
| 1 | **iOS audio unlock present** — `_initAudio` is `async`; `await resume()` + silent warm-up buffer run *inside* the start gesture; `touchend`/`pointerup`/`click` arming + `_started` guard | Without it the rig is silent on iPhone Safari. Highest-value single check. |
| 2 | **Inlined core is current** — the inlined `HandySynth` matches the iOS-fixed v1.1 core, not a pre-fix snapshot | Variants inline core (relative imports don't resolve), so it drifts. A polished variant can wrap a stale, broken core. |
| 3 | **MediaPipe pin exact** — `@mediapipe/tasks-vision@0.10.18`, jsdelivr, model from `storage.googleapis.com` | Unpinned or moved CDN = silent future breakage. |
| 4 | **Module script passes `node --check`** | Syntax sanity before anything downstream. |

---

## Tier 2 — Polish Coverage

Run the 13 items from [VARIANT-POLISH.md](VARIANT-POLISH.md). Record **interpretation**, not just presence — an instrument's model can make an item adapt or not apply.

- **pass** — implemented as spec
- **adapted** — implemented, but reshaped for this instrument's model *(one-line reason)*
- **missing** — should exist, absent
- **N-A** — genuinely doesn't apply *(one-line reason)*

> [!note] Continuous/monophonic instruments legitimately *adapt* several items. Pulling Cliff's pause couldn't "release the note" — it became a 20 ms de-click ramp with the loop split (draw keeps running, audio gates). A presence-only check would have mis-scored that as missing. Score interpretation, not just the symbol.

The 13: EMA smoothing · clean hand render · cursor particles · immersive auto-hide · release-on-vanish · spacebar pause · help overlay · 30s auto-pause · pinch hysteresis · velocity sensitivity · AudioContext resume guard · responsive resize · toast system.

---

## Tier 3 — Contract & Metadata

Surface gaps; never fabricate values. **Does not block** (except routing fields).

| Check | Detail |
|-------|--------|
| **Routing fields** | `slug` and `lineage` present and correct. A wrong value misroutes the move step — distinct failure class, treat as a near-blocker. |
| **Version stamp** | Apply the lifecycle rule below. Fills the `version` field. |
| **Remaining frontmatter** | `name`, `status`, `date`, `author` present. Flag missing `date`/`author`; never invent an `author`. |
| **Required sections** | Synopsis → How to Play → Guide → Technical, in order. |
| **Screenshots by convention** | `hero.png` is the card image; others discovered from `screenshots/`; none declared in the about file. |

### Version Lifecycle

| State | Stamp | Meaning |
|-------|-------|---------|
| Fresh landing, pre-polish | **v0.1** | The variant as received, whatever the author's internal history. Collapse prior author increments into this entry. |
| After a clean polish pass | **v0.2b** | Polish applied, beta. `status: beta`. |
| Subsequent passes | bump from there | Stable promotion is an operator call. |

Stamp three places consistently: frontmatter `version`, the in-app subtitle, and the about file's Version History.

---

## The Screening Report

The deliverable. One per landed variant.

```
SCREENING — <slug>

Tier 1 (gates):   PASS | BLOCKED — <named blocker(s)>
Tier 2 (polish):  <n> pass · <n> adapted · <n> missing · <n> N-A
Tier 3 (contract): <surfaced gaps — missing fields, section order, routing>

Suggested updates (ranked by impact):
  1. <highest-impact refinement>
  2. ...
```

The ranked list is the point — what to fix first if the operator wants the variant improved before it ships. Tier-1 blockers always rank above polish; polish above cosmetics.
