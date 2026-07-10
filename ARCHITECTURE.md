# Variant Architecture Registry

**Version:** 1.0
**Date:** 2026-06-03
**Status:** Active (initial pass — `syrinx` and audio-engine column pending migration)
**Scope:** Which code shape each variant is, so a cross-cutting fix uses the right per-architecture recipe and skips N-A variants without re-reading them cold.

→ see: [Cross-Variant Propagation design](../pyrefey-deploy/docs/superpowers/specs/2026-06-03-cross-variant-propagation-design.md)

---

## Why this exists

The same logical fix is a *different* physical edit per code shape. This knowledge used to live only in
`tools/safari-silence-fix.py` (which patched 3 shapes by string-matching). Written down here once, the
sweep reads it instead of re-deriving it every time.

## Architecture types

| Type | Signature | Patch note |
|------|-----------|------------|
| `class-expanded` | `class HandySynth`, readable whitespace, `_initAudio` / `_start(overlayEl)` | Default recipe target — multi-line anchors |
| `class-minified` | `class HandySynth`, collapsed whitespace, avg line length high | Same logic, **different anchor strings** (no spaces) |
| `flat-module` | Top-level functions, no class, `initNoise(audioCtx)` | Standalone recipe — not class-based |
| `bespoke` | No HandySynth class; custom audio path | Classify per-fix before patching; no shared recipe |

## Registry

| Variant | Architecture | Lines | Notes |
|---------|--------------|------:|-------|
| air-guitar | `class-expanded` | 1163 | |
| augury | `class-expanded` | 2358 | **Was `class-minified`; de-minified (prettier) at v2.6, 2026-07-10** — standard multi-line anchors now apply; no minified variants remain |
| crystal-harp | `class-expanded` | 1611 | |
| drift | `class-expanded` | 1312 | |
| drumspace | `flat-module` | 1420 | Percussion; no pitch axis — many polish concerns are N-A |
| finger-guns | `class-expanded` | 2118 | Active redesign (shotgun) |
| fireflies | `class-expanded` | 1232 | |
| lumen | `class-expanded` | 1063 | |
| pulse | `class-expanded` | 1372 | |
| runecatch | `class-expanded` | 2067 | **Was `class-minified` per safari script; rewritten to expanded in v2.0** — registry is current, script is stale |
| stellar-conductor | `class-expanded` | 1319 | |
| synesthesia | `class-expanded` | 1434 | |
| syrinx | `bespoke` | 871 | No HandySynth class, no `_initAudio` — needs human classification before any sweep patches it |
| theremin | `class-expanded` | 1098 | |

Excluded — not an instrument: `build` (platform / redirect page).

## Maintenance

- The sweep treats this table as a hint and **re-validates** against the files. A variant whose signature
  no longer matches its row is a finding (as runecatch was).
- Audio-engine family per variant is to be added during the migration sweep — useful for concerns scoped to
  a synthesis approach (FM, subtractive, sample) rather than all variants.
