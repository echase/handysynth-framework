# Concern Status — rollup board

**Generated from the `status:` frontmatter in each `concerns/<id>.md`. Do not hand-edit.**
Last regenerated: 2026-06-20 (second sweep — 18 HandySynth instrument variants × 4 concerns; 4 new variants classified against live files; lumen velocity reconciled map↔file)
Manual update 2026-07-10: stellar-conductor v1.8b closed two-hand-role-stability (sticky-slot `pickRoles`) and reconciled velocity-from-history to the canonical `pushPos`/`velAt` helper. No generator script exists in-repo; cells hand-edited to match the concern-file frontmatter.
Manual update 2026-07-10 (b): augury v2.7 closed one-euro-smoothing (per-key x/y OneEuro pairs; de-minified at v2.6 so minified-anchor caveat is gone). Also reconciled the stale pulling-cliff one-euro cell to the concern file's applied@v0.8b (2026-07-05 sweep).
Manual update 2026-07-15: `site/handysynth/motion/motion.v1.js` v1.0.0 shipped (ADR 014, pin-and-inline delivery). It is the new canonical source for **one-euro-smoothing**, **velocity-from-history**, and **two-hand-role-stability** — supersedes the individual canonical-source pointers below (finger-guns' `OneEuro`, the concern doc's own `pushPos`/`velAt`, stellar-conductor v1.8b's `pickRoles`). The matrix below is unchanged: no sweep migration (ADR 009/014 — adoption is lazy, at each variant's next substantive change). Going forward, "closing" any of these three concerns for a variant means pinning `motion.v1.js` rather than hand-inlining a fresh copy of the old canonical source.

→ source of truth: each `concerns/<id>.md` · format: [README.md](README.md) · backlog: [CANDIDATES.md](CANDIDATES.md)

---

## How to read this

Rows = concerns, columns = variants. Cells: `✓vN` applied · `def` deferred · `n/a` · `▲` needs-patch · `?` unknown.

**Pull check:** find your variant's column, scan for `def` / `▲` / `?`. None of those = caught up, proceed.

One-liner (open rows for a given variant):

```bash
grep -l "<variant>:.*\(deferred\|unknown\|needs-patch\)" concerns/*.md
```

**Scope:** this board tracks the 18 **HandySynth-lineage instrument variants**. Excluded: `build` (redirect page), `voices` / `gestures` (libraries, not playable variants), and the 3 **Pyrefey-lineage** variants (`portal-pug`, `pyrefey-conductor`, `pyrefey-original`) — the Pyrefey lineage is pre-modular and not yet folded into the concern ledger.

## Matrix

| concern | airg | augu | crys | drif | drum | embr | fing | fire | loom | lume | lmra | pcli | puls | rune | stel | syne | syri | ther |
|---------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|
| one-euro-smoothing | ▲ | ✓v2.7 | ▲ | ▲ | ▲ | ▲ | ✓v2 | ▲ | ▲ | ▲ | ▲ | ✓v0.8b | n/a | ▲ | n/a | ▲ | def | ▲ |
| velocity-from-history | ▲ | ✓ | ▲ | n/a | ▲ | n/a | n/a | n/a | ▲ | ✓ | ✓ | ▲ | def | ✓ | ✓v1.8b | ▲ | n/a | n/a |
| swap-and-pop-particles | ✓ | ✓v2 | ✓ | ✓ | ✓ | ✓ | n/a | ✓ | ▲ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| two-hand-role-stability | ✓v1 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | ▲ | n/a | n/a | ✓v0.7b | n/a | ▲ | ✓v1.8b | ▲ | ✓v1 | ▲ |

Columns: airg=air-guitar · augu=augury · crys=crystal-harp · drif=drift · drum=drumspace · embr=embra ·
fing=finger-guns · fire=fireflies · loom=loom · lume=lumen · lmra=lumora · pcli=pulling-cliff · puls=pulse ·
rune=runecatch · stel=stellar-conductor · syne=synesthesia · syri=syrinx · ther=theremin.

## Tallies (post-sweep)

| concern | applied | needs-patch | n/a | deferred |
|---------|:-------:|:-----------:|:---:|:--------:|
| one-euro-smoothing | 3 | 12 | 2 | 1 |
| velocity-from-history | 5 | 6 | 6 | 1 |
| swap-and-pop-particles | 16 | 1 | 1 | 0 |
| two-hand-role-stability | 4 | 3 | 11 | 0 |

`needs-patch` here is "applicable + not yet done" — it splits into **execute-now** and **defer** in the patch
queue, which the matrix doesn't encode. See each concern's *Sweep findings* sections for the split, and the
patch queue below for execution order.

## Patch queue (recommended order)

Propose-only — no edits land until approved. Ordered lowest-risk → highest-judgment:

1. **swap-and-pop-particles** — the 2026-06-04 13-agent batch closed the original set; the second sweep
   reopened **one** variant: **loom** (convert `pendingFlares` L1298, `blooms` L1317, `CURSOR_PARTICLES`
   L1369; leave `toasts` L1380). Lowest-risk warm-up. The other 3 new variants (embra, lumora, pulling-cliff)
   already use swap-and-pop natively.
2. **velocity-from-history / execute** — **drumspace** (replace bespoke delta with `velAt`). lumen is now done
   (canonical `pushPos`/`velAt` confirmed in-file). **Defer:** loom and pulling-cliff already deliver onset
   velocity via 1–2-frame deltas — conform to the windowed helper on next touch (jitter-stability), not blocking.
3. **one-euro-smoothing** — 12 variants remain on fixed-k EMA. Lead with **theremin** and **crystal-harp**
   (continuous pitch → most audible win); embra, loom, lumora still queued. pulling-cliff (v0.8b) and
   augury (v2.7) are done; augury's minified-token caveat is obsolete (de-minified at v2.6).
4. **two-hand-role-stability / execute** — **theremin** and **loom** (handedness drives per-hand octave shift →
   label-flip swaps octaves). Highest per-variant value. air-guitar, syrinx, **pulling-cliff**, and now
   **stellar-conductor** (v1.8b) already solve it (patterns: energy-slots, X-sort, seed-then-track-by-position).

Deferred-but-tracked (revisit triggers in each concern's *Deferrals* / *Sweep findings*): velocity routing for
synesthesia / crystal-harp / air-guitar / loom / pulling-cliff; two-hand for synesthesia (verify) and runecatch
(defer); one-euro for syrinx (bespoke); drift stereo flip flagged for human review.
