# Variant Polish Fan-Out — Serial Handoff

**Version:** 1.0
**Date:** 2026-06-04
**Status:** Active
**Scope:** Bring every remaining catalog variant up to the current VARIANT-POLISH standard, one variant at a time, folding each pass's learnings back into the standard before the next.

---

## Mission

Apply the polish standard to the remaining variants **serially**. Each pass: screen the variant, apply the standard, verify it live, then **fold what you learned back into [VARIANT-POLISH.md](VARIANT-POLISH.md)** so the next variant inherits a sharper standard. **Stop for operator confirmation after every variant.**

## Why serial, not the parallel fan-out

[POLISH-PROTOCOL-PENDING.md](POLISH-PROTOCOL-PENDING.md) assumes a "batch-1 parallel-agent apparatus." That is the wrong tool here, on purpose. A parallel fan-out freezes the standard at T0 and applies the same frozen rules to all variants at once — it cannot learn. Serial is deliberate: variant N+1 benefits from everything variants 1..N taught the standard. The cost (wall-clock) buys a compounding-quality standard and a human checkpoint between each irreversible-ish edit.

## The per-variant loop

Run this for each variant in the work-list. One variant per loop. Do not batch.

0. **Orient.** Read the current [VARIANT-POLISH.md](VARIANT-POLISH.md), this variant's row in [concerns/STATUS.md](concerns/STATUS.md), and its architecture in [ARCHITECTURE.md](ARCHITECTURE.md). Note `def`/`▲`/`?` cells.
1. **Screen.** Run [VARIANT-SCREENING.md](VARIANT-SCREENING.md) — Tier 1 gates, Tier 2 polish coverage scored *pass / adapted / missing / N-A*, Tier 3 contract. Produce the ranked gap report. This is the work order.
2. **Apply.** Implement the standard against the gaps. Score interpretation, not presence — a continuous/monophonic instrument *adapts* items (e.g. pause = master-bus de-click ramp, not note-off). Respect bespoke affordances (see Tripwires).
3. **Verify live.** Open in Safari. Walk the standard's acceptance checks by hand — pinch steadiness, pause→silence→resume, auto-pause, help overlay, immersive fade, iOS audio. Inspected-only ≠ verified; say which is which.
4. **Fold learnings → standard.** If the pass taught anything durable (a new failure mode, a better pattern, an item that needed adapting, a missing item), update [VARIANT-POLISH.md](VARIANT-POLISH.md): edit the item, bump the standard's version + changelog, and reconcile [concerns/](concerns/) if a code concern moved. This step is the point of the whole exercise — do not skip it even when "nothing changed" (record that too).
5. **Stamp the variant.** Bump the variant's own app `version` per the lifecycle convention in [VARIANT-SCREENING.md](VARIANT-SCREENING.md) (a polish pass → `v0.2b`-class bump), across frontmatter / subtitle / Version History. Record which polish-standard version it now conforms to.
6. **Confirmation gate.** STOP. Present: the gap report, what changed, what's runtime-verified vs inspected, any standard updates, and any flagged design choices. **Wait for explicit operator go-ahead before starting the next variant.** Never roll into the next variant automatically. Deploy/commit only on explicit approval (see Tripwires).

## Phase 0 — settle v2, then fold (do this first)

There is no stable standard to fan out until the v2 enhancements in [POLISH-PROTOCOL-PENDING.md](POLISH-PROTOCOL-PENDING.md) are resolved on **theremin** (the prototype) and folded into [VARIANT-POLISH.md](VARIANT-POLISH.md):

- **#14 clap-to-pause** — ⚠ see the tripwire. Single-clap worked; clap-clap has failed 3×. If the current attempt fails its HUD test, **do not tune again** — surface "single-clap-with-guard vs clap-clap" to the operator as a design decision and fold whichever they pick.
- **#7 help overlay** upgrade (viewport-filling, ≥16pt, on-screen `?` badge).
- **#6/#8 pause semantics** (master-bus click-free silence covering continuous voices; freeze tracking; decide inference-alive-while-paused vs suspend).
- **#3 cursor** made universal (verify bespoke affordances first).

Fold the settled set as the new baseline (suggest **v1.2** or **v2.0**) with a changelog entry. Only then begin the fan-out. Treat Phase 0 as its own confirmation-gated pass.

## Work-list & recommended order

Catalog HandySynth variants, lowest-risk → highest-judgment. Order by architecture so the standard's reference patch stabilizes on the common shape before hitting the odd ones. Confirm each variant's architecture against [ARCHITECTURE.md](ARCHITECTURE.md) before editing.

| # | Variant | Architecture | Known starting state | Notes |
|---|---------|--------------|----------------------|-------|
| — | **theremin** | class-expanded | v2 prototype (uncommitted) | Phase 0 source — settle + fold, don't "fan out" |
| 1 | **pulling-cliff** | class-expanded | v0.2b (16-item pass done) | Freshest + known. Needs v2 delta + cursor #3. Good first fan-out to validate the folded standard |
| 2 | air-guitar | class-expanded | v1.1 sweep | two-hand already solved its own way — don't clobber |
| 3 | crystal-harp | class-expanded | v1.1 sweep | continuous pitch → smoothing is most audible here |
| 4 | drift | class-expanded | v1.1 sweep | |
| 5 | fireflies | class-expanded | v1.1 sweep | |
| 6 | loom | class-expanded | newer (not in concern board) | screen carefully — may predate concerns |
| 7 | lumen | class-expanded | v1.1 sweep | |
| 8 | pulse | class-expanded | v1.1 sweep | `vizQueue` particle path is bespoke — preserve |
| 9 | runecatch | class-expanded | v1.1 sweep | |
| 10 | stellar-conductor | class-expanded | v1.1 sweep | latent two-hand label-flip bug — real win |
| 11 | synesthesia | class-expanded | v1.1 sweep | |
| 12 | **drumspace** | flat-module | v1.1 sweep | no class — different patch anchors |
| 13 | **augury** | class-minified | v1.1 sweep | minified-token matching required; slowest, most error-prone |
| 14 | **syrinx** | bespoke | v1.1 sweep | custom shape — highest judgment, do last |

Re-screen at the start of each pass; the table is a starting hypothesis, [concerns/STATUS.md](concerns/STATUS.md) + the screen are truth. (Pyrefey-lineage variants in `site/pyrefey/` are out of scope unless the operator adds them.)

## Standard-evolution protocol

How to fold learnings in step 4 without standard-drift:

- **Adapt vs add.** If an existing item needed reinterpreting for an instrument model, sharpen that item's *acceptance* wording — don't add an item. Add a new item only for a genuinely new, broadly-applicable requirement.
- **Version + changelog.** Every fold bumps the standard's version and adds a one-line changelog entry naming the variant that taught it. The standard's version is the audit trail of the fan-out.
- **Concern-board sync.** If a fold corresponds to a tracked code concern (one-euro-smoothing, velocity-from-history, swap-and-pop, two-hand-role-stability), update that variant's cell in the concern frontmatter so [concerns/STATUS.md](concerns/STATUS.md) regenerates correctly. Don't hand-edit STATUS.md.
- **Two version axes, kept distinct.** The *variant's* app version (`v0.1`→`v0.2b`, frontmatter) ≠ the *standard's* version (`v1.1`→…). Record both: stamp the variant, note which standard version it now meets.

## Tripwires & guardrails

- **clap-clap (#14):** failed 3×. Do not tune a 5th time — surface the design choice. (Phase 0.)
- **Cursor (#3):** verify before forcing. `finger-guns` indicates the cursor via its aim reticle; don't clobber a bespoke affordance. Same caution for any variant with an existing pointer metaphor.
- **augury (minified):** anchor strings differ; `tools/safari-silence-fix.py` references may be stale (per inventory gotcha #4). Match tokens carefully.
- **pulse / finger-guns particles:** `pulse` has a bespoke `vizQueue`; `finger-guns` was `n/a` for swap-and-pop. Preserve bespoke paths.
- **Deploy gate:** plan approval never authorizes a prod deploy. No rsync / git push without explicit confirmation in the live chat for that action. Per-project pushes never use `--delete`.
- **End-of-turn:** open new/updated variants in Safari for the operator to test.
- **Honest scoping:** report runtime-verified vs inspected-only separately. Headless preview runs 0×0 with camera denied — the draw loop won't arm, so most polish is inspected-only until Safari-tested.

## Definition of done

- Every work-list variant brought to the current standard (or its gaps consciously deferred with a logged reason).
- [VARIANT-POLISH.md](VARIANT-POLISH.md) version reflects the accumulated learnings; changelog traces which variant taught what.
- [concerns/](concerns/) frontmatter reconciled; STATUS.md regenerated clean.
- Each variant app-version stamped; each conforms-to-standard version recorded.
- No variant advanced past its confirmation gate without operator go-ahead.

## State at handoff (2026-06-04)

- **Standard:** VARIANT-POLISH v1.1 (16 items). v2 enhancements pending in POLISH-PROTOCOL-PENDING.md, prototyping on theremin, **not folded**.
- **theremin:** v2 prototype, uncommitted (clap-clap unresolved).
- **pulling-cliff:** v0.2b — 16-item pass + iOS unlock done; still missing cursor #3 and the v2 deltas.
- **All others:** v1.1 sweep baseline; need the v2 delta once folded.
- **Concern board:** first sweep complete (14×4 classified); swap-and-pop done across 13; smoothing/velocity/two-hand queues open.
