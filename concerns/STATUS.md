# Concern Status — rollup board

**Generated from the `status:` frontmatter in each `concerns/<id>.md`. Do not hand-edit.**
Last regenerated: 2026-06-04 (first sweep complete — all 14 × 4 cells classified against live files)

→ source of truth: each `concerns/<id>.md` · format: [README.md](README.md) · backlog: [CANDIDATES.md](CANDIDATES.md)

---

## How to read this

Rows = concerns, columns = variants. Cells: `✓vN` applied · `def` deferred · `n/a` · `▲` needs-patch · `?` unknown.

**Pull check:** find your variant's column, scan for `def` / `▲` / `?`. None of those = caught up, proceed.

One-liner (open rows for a given variant):

```bash
grep -l "<variant>:.*\(deferred\|unknown\|needs-patch\)" concerns/*.md
```

## Matrix

| concern | airg | augu | crys | drif | drum | fing | fire | lume | puls | rune | stel | syne | syri | ther |
|---------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|
| one-euro-smoothing | ▲ | ▲ | ▲ | ▲ | ▲ | ✓v2 | ▲ | ▲ | n/a | ▲ | n/a | ▲ | def | ▲ |
| velocity-from-history | ▲ | ✓ | ▲ | n/a | ▲ | n/a | n/a | ▲ | def | ✓ | ✓ | ▲ | n/a | n/a |
| swap-and-pop-particles | ✓ | ✓v2 | ✓ | ✓ | ✓ | n/a | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| two-hand-role-stability | ✓v1 | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | ▲ | ▲ | ▲ | ✓v1 | ▲ |

Columns: airg=air-guitar · augu=augury · crys=crystal-harp · drif=drift · drum=drumspace · fing=finger-guns ·
fire=fireflies · lume=lumen · puls=pulse · rune=runecatch · stel=stellar-conductor · syne=synesthesia ·
syri=syrinx · ther=theremin.

## Tallies (post-sweep)

| concern | applied | needs-patch | n/a | deferred |
|---------|:-------:|:-----------:|:---:|:--------:|
| one-euro-smoothing | 1 | 10 | 2 | 1 |
| velocity-from-history | 3 | 5 | 5 | 1 |
| swap-and-pop-particles | 13 ✅ | 0 | 1 | 0 |
| two-hand-role-stability | 2 | 4 | 8 | 0 |

`needs-patch` here is "applicable + not yet done" — it splits into **execute-now** and **defer** in the patch
queue, which the matrix doesn't encode. See each concern's *Sweep findings* section for the split, and the
patch queue below for execution order.

## Patch queue (recommended order)

Propose-only — no edits land until approved. Ordered lowest-risk → highest-judgment:

1. ~~**swap-and-pop-particles**~~ — ✅ **DONE 2026-06-04** (13-agent fan-out, 38 loops; finger-guns n/a;
   pulse `vizQueue` preserved). Human load-check still owed.
2. **velocity-from-history / execute** — drumspace, lumen. Clean adds; reconcile drumspace's bespoke delta.
3. **one-euro-smoothing** — 10 variants. Lead with **theremin** and **crystal-harp** (continuous pitch → most
   audible win). augury needs minified-token matching.
4. **two-hand-role-stability / execute** — **theremin**, **stellar-conductor**. Real latent label-flip bugs;
   highest per-variant value. (air-guitar + syrinx already solved it two different ways.)

Deferred-but-tracked (revisit triggers in each concern's *Deferrals* / *Sweep findings*): velocity routing for
synesthesia / crystal-harp / air-guitar; two-hand for synesthesia (verify) and runecatch (defer); drift stereo
flip flagged for human review.
