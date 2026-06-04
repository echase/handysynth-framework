---
id: swap-and-pop-particles
intent: Remove dead particles with swap-and-pop instead of splice to avoid O(n) GC stalls
why: splice() on a particle array is O(n) and churns memory; at MAX_NOTES/MAX_BIRDS scale it causes frame-rate dips and GC stutter. Swapping the dead item with the last element then pop() is O(1) and allocation-free. Pure perf, zero behavior change.
acceptance: No behavior change — same particles, same visuals. Frame rate holds steady under heavy particle load (no periodic micro-stutter). Verified by load-check (no console errors) + visual parity.
detection: Search particle update loops for `.splice(` inside per-frame ticks. Presence of `arr.splice(i, 1)` in a draw/tick loop = needs-patch. Loops already using `arr[i] = arr[arr.length-1]; arr.pop()` = applied.
applicability: Any variant maintaining particle/effect arrays mutated every frame (birds, notes, sparks, ripples, trails, shocks). N-A for variants with no per-frame particle arrays.
status:
  air-guitar: applied
  augury: applied@v2
  crystal-harp: applied
  drift: applied
  drumspace: applied
  finger-guns: n/a
  fireflies: applied
  lumen: applied
  pulse: applied
  runecatch: applied
  stellar-conductor: applied
  synesthesia: applied
  syrinx: applied
  theremin: applied
---

## Canonical source

`site/handysynth/augury/index.html` — applied across BIRDS / NOTES / FEATHERS / STARS / TRAILS / RIPPLES.

```javascript
for (let i = arr.length - 1; i >= 0; i--) {
  const p = arr[i];
  // ...update p...
  if (p.life <= 0) { arr[i] = arr[arr.length - 1]; arr.pop(); continue; }
  // ...draw p...
}
```

The reverse-iteration + swap-and-pop is safe because the swapped-in element occupies index `i`, which the
descending loop has not yet visited.

## Recipe

Architecture-agnostic and order-independent (particle draw order doesn't matter visually). Convert each
per-frame `splice` removal to the pattern above. Iterate descending if not already.

### all architectures
Identical change — pure JS array idiom. No class/audio coupling.

## Notes

- Only matters where particle order is irrelevant (true for all known effect arrays). Do NOT apply to arrays
  whose draw order is load-bearing (z-sorted layers) — none known, but the sweep should confirm.
- `arch-sensitive: no`. Lowest-risk item in the backlog; good warm-up for the sweep.

## Sweep findings (2026-06-04)

- **needs-patch (13):** every variant except augury maintains at least one per-frame particle/effect array
  removed with `splice` — broadest concern in the ledger. Recommended warm-up batch.
- **applied (1):** augury (canonical source, all six arrays already swap-and-pop).
- **⚠ order-sensitive exception — pulse:** pulse's `vizQueue` (≈ line 1187) is timing-ordered; its `splice`
  must stay. Convert only pulse's order-free arrays (SHOCKS ≈ line 687, CURSOR). Every other variant's
  effect arrays are draw-order-irrelevant and safe to convert wholesale.

## Applied (2026-06-04 batch — 13-agent parallel fan-out)

38 per-frame removal loops converted across 12 variants. Remaining-`splice` counts verified per file (matches
each agent report); air-guitar idiom spot-checked; pulse `vizQueue.splice` confirmed intact @1187.

| variant | converted | left-as-is |
|---|---|---|
| air-guitar | 3 (SPARKS, NOTES, CURSOR_PARTICLES) | toasts |
| crystal-harp | 5 (MUTE_PARTICLES, SHIMMER, RIPPLES, recentNotes, CURSOR_PARTICLES) | toasts |
| drift | 4 (MIST, SHIMMER, BREATH, CURSOR_PARTICLES) | toasts |
| drumspace | 4 (FX_BURSTS, FX_RIPPLES, FX_CHOKES, CURSOR_PARTICLES) | — |
| fireflies | 3 (sparks, noteLabels, CURSOR_PARTICLES) | toasts |
| lumen | 2 (blooms, CURSOR_PARTICLES) | toasts |
| pulse | 2 (SHOCKS, CURSOR_PARTICLES) | **vizQueue** + toasts |
| runecatch | 7 (hit/miss/trail particles, gradeFlashes, sigils, laneNotes, CURSOR_PARTICLES) | toasts |
| stellar-conductor | 3 (RIPPLES, SPARKS, CURSOR_PARTICLES) | toasts |
| synesthesia | 3 (marks×2, CURSOR_PARTICLES) | toasts |
| syrinx | 1 (cursor) | — |
| theremin | 1 (CURSOR_PARTICLES) | toasts |

**Cross-variant invariant — `toasts` is always order-bound.** Every variant with a toast queue computes each
toast's Y as `H*0.85 - (toasts.length-1-i)*30` — the array index *is* the stack position, so swap-and-pop
would teleport live toasts. All 11 variants correctly skipped it. **Future sweeps: `toasts` is permanently
n/a for this concern; do not re-flag.**

**finger-guns = n/a (not needs-patch):** it has zero `splice` — it removes dead particles via `.filter()`
reassignment (`game.feathers`/`comicTexts`/`scorePopups`). No splice anti-pattern to convert. Note for a
*separate* future concern: per-frame `.filter()` reallocates the whole array each frame (O(n) + a fresh
allocation), which swap-and-pop-in-place would also avoid — but that is a different transform, out of scope
here.

**Verification still owed (human):** load each edited variant, confirm no console errors and visual parity
(same particles, no stutter). Pure-perf change — no audio/gesture acceptance test needed.
