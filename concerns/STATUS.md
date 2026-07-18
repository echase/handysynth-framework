# Concern Status — rollup board

**Generated from the `status:` frontmatter in each `concerns/<id>.md`. Do not hand-edit.**
Last regenerated: 2026-06-20 (second sweep — 18 HandySynth instrument variants × 4 concerns; 4 new variants classified against live files; lumen velocity reconciled map↔file)
Manual update 2026-07-10: stellar-conductor v1.8b closed two-hand-role-stability (sticky-slot `pickRoles`) and reconciled velocity-from-history to the canonical `pushPos`/`velAt` helper. No generator script exists in-repo; cells hand-edited to match the concern-file frontmatter.
Manual update 2026-07-10 (b): augury v2.7 closed one-euro-smoothing (per-key x/y OneEuro pairs; de-minified at v2.6 so minified-anchor caveat is gone). Also reconciled the stale pulling-cliff one-euro cell to the concern file's applied@v0.8b (2026-07-05 sweep).
Manual update 2026-07-17: `site/handysynth/core/core.v1.js` v1.0.0 shipped in the Pyrefey repo (merge `fffc293`; extracted from this repo's `handysynth.js` v1.2 @ `0aaf997`). The ADR 009 shared core now exists — migrating onto it (plus clearing known core-level bugs) is what drops a variant's `b` suffix; adoption stays lazy, no matrix change. It is the canonical source for the MediaPipe-init/camera/frame-loop/pinch pipeline ~24 variants re-inline, and for two-hand octave roles it carries the donor's positional `isLeft` fix (complements `motion.v1.js` `createRoleTracker` for the **two-hand-role-stability** row). Dual-model fps-budget spike: Outcome A — budget holds only under cadence arbitration; `createFpsArbiter` ships inside core and is mandatory for dual-model variants (evidence: `site/handysynth/core/CHANGELOG.md`). The ventriloquist/gestural-looper platform gate is cleared.
Manual update 2026-07-15: `site/handysynth/motion/motion.v1.js` v1.0.0 shipped (ADR 014, pin-and-inline delivery). It is the new canonical source for **one-euro-smoothing**, **velocity-from-history**, and **two-hand-role-stability** — supersedes the individual canonical-source pointers below (finger-guns' `OneEuro`, the concern doc's own `pushPos`/`velAt`, stellar-conductor v1.8b's `pickRoles`). The matrix below is unchanged: no sweep migration (ADR 009/014 — adoption is lazy, at each variant's next substantive change). Going forward, "closing" any of these three concerns for a variant means pinning `motion.v1.js` rather than hand-inlining a fresh copy of the old canonical source.

Manual update 2026-07-17 (c): new concern `camera-sampled-impulse.md` — delivering ballistic gesture energy into a physics sim from camera-sampled positions (resample study, jitter-only smoothing, displacement glitch guard ahead of smoothing, sticky ease-out recovery, substep interpolation), seeded by Boomslang's Phase 0 energy-delivery spike (boomslang v0.1b, Pyrefey repo, branch `feat/boomslang-v0.1b`; synthetic evidence, gate decision Tier 2 provisional pending felt play-test; live probe ships at `boomslang/spike/probe.html`). Applies to variants driving camera-fed dynamical systems — n/a for all 18 current board variants, so the matrix gains the row with no open cells. Key transferable finding: cursor-tuned One-Euro (1.6/0.02) eats ~2/3 of ballistic stroke energy; smoothing separates jitter only, gesture discrimination belongs to the sim.

Manual update 2026-07-17 (b): new concern `flap-fidelity.md` — bilateral-antiphase flap detection + synchrony-gate discrimination (flap vs reposition), seeded by Thermal's Phase 0 spike (thermal v0.1b, Pyrefey repo, branch `feat/thermal-v0.1b`; synthetic evidence, live rows provisional pending felt play-test). Applies to body-scale periodic-gesture variants (thermal, and Sway / Tremolo Garden when built) — n/a for all 18 current board variants, so the matrix gains the row with no open cells. Thermal itself applies one-euro natively (this build clears its `▲` inheritance question — it never inherits the fixed-k EMA).

Manual update 2026-07-17 (d): new concern `two-body-pose-reliability.md` — where two-person `PoseLandmarker` (`numPoses: 2`) is usable on one webcam, seeded by Between's Phase 0 spike (between v0.1b, Pyrefey repo, branch `feat/between-v0.1b`; synthetic + headless-live evidence, gate decision duet-full symmetry-hardened, PROVISIONAL pending a two-person felt play-test — the live range map ships deliberately unfilled, and `between/spike/probe.html` is self-serve so the session with two people can fill it). Applies to variants tracking two or more bodies from one camera — n/a for all 18 current board variants (every one is single-body or hand-scale), so the matrix gains the row with no open cells. Key transferable finding: **MediaPipe carries no cross-frame pose identity, but a relational design can be immune rather than merely robust** — position-sort anchors every frame (never read the pose index) and keep every relational scalar symmetric in (A,B), and the index-swap rate stops being a gating risk. Between measures `max |Δ| == 0` (exact, not approximate) feeding (A,B) vs (B,A); mirroring is provably swap-invariant because reflection preserves norms. This collapses the spec's first two gate outcomes into the same shipped artifact. It is `two-hand-role-stability` generalized to body scale, and that concern's `n/a` reasoning for embra ("anatomical identity, no handedness label") does NOT extend to two independent bodies.

Manual update 2026-07-18: new concern `oscillation-tracking-envelope.md` — where camera-sampled hand oscillation (~1–10 Hz) is readable (per-cycle reversals vs band-energy-only vs collapse), seeded by Tremolo Garden's Phase 0 spike (tremolo-garden v0.1b, Pyrefey repo, branch `feat/tremolo-garden-v0.1b`; synthetic evidence 31/31, gate decision Mode A PROVISIONAL pending felt play-test — the live amplitude × frequency grid ships deliberately unfilled, and `tremolo-garden/spike/probe.html` is self-serve with auto-binning + results-JSON export so the session with a hand at the camera fills it). Applies to variants pricing sound on measured oscillation — n/a for all 18 current board variants, so the matrix gains the row with no open cells. Key transferable findings: frame cadence, not the tracker, sets the readable band's ceiling (rigid 30 fps mis-reads 6 Hz by +24% through grid quantization and merges ~25% of reversals at 8 Hz — run detection at camera-native cadence); detector amp is EMA-attenuated (~0.5×), so intensity gains calibrate against measured amp; One-Euro must be tuned open (minCutoff ≥ 2, beta ≥ 0.2) or it eats the 4–8 Hz band (extends `camera-sampled-impulse`'s smoothing finding to oscillation).

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
| flap-fidelity | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| camera-sampled-impulse | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| two-body-pose-reliability | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| oscillation-tracking-envelope | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |

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
