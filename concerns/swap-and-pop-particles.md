---
id: swap-and-pop-particles
intent: Remove dead particles with swap-and-pop instead of splice to avoid O(n) GC stalls
why: splice() on a particle array is O(n) and churns memory; at MAX_NOTES/MAX_BIRDS scale it causes frame-rate dips and GC stutter. Swapping the dead item with the last element then pop() is O(1) and allocation-free. Pure perf, zero behavior change.
acceptance: No behavior change — same particles, same visuals. Frame rate holds steady under heavy particle load (no periodic micro-stutter). Verified by load-check (no console errors) + visual parity.
detection: Search particle update loops for `.splice(` inside per-frame ticks. Presence of `arr.splice(i, 1)` in a draw/tick loop = needs-patch. Loops already using `arr[i] = arr[arr.length-1]; arr.pop()` = applied.
applicability: Any variant maintaining particle/effect arrays mutated every frame (birds, notes, sparks, ripples, trails, shocks). N-A for variants with no per-frame particle arrays.
status:
  air-guitar: needs-patch
  augury: applied@v2
  crystal-harp: needs-patch
  drift: needs-patch
  drumspace: needs-patch
  finger-guns: needs-patch
  fireflies: needs-patch
  lumen: needs-patch
  pulse: needs-patch
  runecatch: needs-patch
  stellar-conductor: needs-patch
  synesthesia: needs-patch
  syrinx: needs-patch
  theremin: needs-patch
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
  must stay. Convert only pulse's order-free arrays (SHOCKS ≈ line 687, CURSOR, toasts). Every other variant's
  effect arrays are draw-order-irrelevant and safe to convert wholesale.
