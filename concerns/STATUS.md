# Concern Status — rollup board

**Generated from the `status:` frontmatter in each `concerns/<id>.md`. Do not hand-edit.**
Last regenerated: 2026-06-04 (4 concerns promoted; per-variant classification still `unknown` — pending first sweep)

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
| one-euro-smoothing | ? | ? | ? | ? | ? | ✓v2 | ? | ? | ? | ? | ? | ? | ? | ? |
| velocity-from-history | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| swap-and-pop-particles | ? | ✓v2 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |
| two-hand-role-stability | ✓v1 | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? | ? |

Columns: airg=air-guitar · augu=augury · crys=crystal-harp · drif=drift · drum=drumspace · fing=finger-guns ·
fire=fireflies · lume=lumen · puls=pulse · rune=runecatch · stel=stellar-conductor · syne=synesthesia ·
syri=syrinx · ther=theremin.

## Reading this board

Almost every cell is `?` — that is correct and honest. These concerns were just defined; nothing has been
classified against the actual files yet. The `✓` cells are the canonical source variants (verified by code
read during authoring). The **first sweep** turns each `?` into `✓` / `▲` / `n/a` by reading the variant and
validating against the concern's `detection` + `applicability` rules.
