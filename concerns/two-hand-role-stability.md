---
id: two-hand-role-stability
intent: Assign two-hand roles by motion/position behavior, not MediaPipe's Left/Right label
why: MediaPipe's handedness label flips when hands cross or on brief occlusion. Any variant that gives the two hands DISTINCT roles (lead/accompaniment, pitch/dynamics, fret/strum, different voices per hand) glitches when the label swaps mid-performance. air-guitar fixed this with sticky, energy-based role assignment that coasts through dropouts. This is a latent BUG class, not a feature.
acceptance: Cross the hands, or briefly occlude one, while playing a two-role gesture — roles stay put, no voice/parameter swap, no dropped note. No flicker when hands pass near each other.
detection: Search for reliance on `handedness` / `category` / `=== 'Left'` / `=== 'Right'` to choose a hand's role. Presence = needs-patch (or verify it's robust). air-guitar's `trackHands`/`resolveRoles` sticky-slot pattern = applied.
applicability: ONLY variants where the two hands have distinct roles. N-A where each hand is independent and symmetric (same mapping regardless of which hand) — there a label swap is harmless. The sweep must classify each variant's two-hand model before deciding.
status:
  air-guitar: applied@v1
  augury: n/a
  crystal-harp: n/a
  drift: n/a
  drumspace: n/a
  embra: n/a
  finger-guns: n/a
  fireflies: n/a
  loom: needs-patch
  lumen: n/a
  lumora: n/a
  pulling-cliff: applied@v0.7b
  pulse: n/a
  pyrefey-original: applied@v3.1
  runecatch: needs-patch
  stellar-conductor: needs-patch
  synesthesia: needs-patch
  syrinx: applied@v1
  theremin: needs-patch
---

## The bug

`handedness` from MediaPipe is per-frame and label-unstable: when hands cross in X, or one is briefly lost
and re-found, Left↔Right can swap. Code like `const fretHand = hands.find(h => h.handedness === 'Left')`
will hand the fret role to the wrong hand for a frame or more — audible as a swapped voice or a jumped
parameter.

Likely-affected (sweep to confirm): `stellar-conductor` (left=density, right=tempo), `syrinx` (spread
between two hands), `drift` (stereo hands), `augury` (different bird species per hand). Symmetric variants
are N-A.

## Canonical source

`site/handysynth/air-guitar/index.html` — persistent slots tracked by position + motion energy, role chosen
by behavior, sticky with hysteresis.

```javascript
let trackA = null, trackB = null;      // persistent slots {x,y,energy,hand,seen}
let strumSlot = null;

function feed(slot, x, y, hand) {
  const vy = (slot.y != null) ? (y - slot.y) : 0;
  slot.energy = slot.energy * 0.85 + Math.abs(vy) * 0.15;   // EMA of motion
  slot.x = x; slot.y = y; slot.hand = hand; slot.seen = 4;
}
// trackHands(): match observations to nearest slot (dist < 0.33), feed matches,
//   fill empty/aged slots with unmatched obs, age out slots not refreshed (coasts dropouts).
// resolveRoles(): role chosen by behavior (lower hand = strum), sticky —
//   only reassign when the other hand clears a hysteresis margin (y > strumSlot.y + 0.03).
```

The role is decided by *which slot behaves like the role* (here: the lower / higher-energy hand), persisted
across frames, and only switched past a deadband — never by the raw label.

## Recipe

### class-expanded / class-minified
Introduce two persistent slots keyed by nearest-position matching (not label). Replace
`handedness`-based role lookup with `resolveRoles()`-style behavioral assignment + hysteresis. The behavior
cue differs per variant (vertical position, motion energy, X-order) — pick the one matching the variant's
two-hand semantics.

### flat-module (drumspace)
N-A unless drumspace assigns distinct per-hand banks — confirm; its hits are likely hand-symmetric.

## Notes

- This is the **highest-value lesson** in the cross-pollination scan: it converts a class of intermittent,
  hard-to-reproduce glitches into a one-time structural fix.
- `arch-sensitive: yes` — depends on each variant's hand-tracking structure and what distinguishes the roles.
- For genuinely symmetric variants, the sweep should mark `n/a` with a one-line reason, not patch them.

## Sweep findings (2026-06-04)

- **applied (2):** air-guitar (canonical sticky-slot pattern) and **syrinx**, which independently solved the
  same bug a simpler way — it **sorts the two hands by X position** each frame instead of trusting the label.
  For variants whose roles map cleanly to left-vs-right screen position, syrinx's sort is a lighter alternative
  to air-guitar's energy-tracked slots. Worth promoting as a second canonical pattern.
- **needs-patch / execute (2):** **theremin** (one hand pitch, other volume) and **stellar-conductor**
  (left=density, right=tempo) — both select role by `handedness`; a label flip mid-performance swaps the two
  control axes. Real latent bugs, highest value, recommend executing.
- **needs-patch / verify (1):** synesthesia — asymmetric two-hand mapping, latent but lower-exposure; confirm
  reproduction before patching.
- **needs-patch / defer (1):** runecatch — has a two-hand path but the role distinction is weak; defer behind
  theremin/stellar-conductor.
- **n/a (7):** augury, crystal-harp, drift, drumspace, finger-guns, fireflies, lumen, pulse — each hand is
  independent and symmetric (same mapping regardless of which hand), so a label swap is harmless.
- **⚠ human review — drift:** drift pans the two hands hard L/R for stereo. A label swap would flip the stereo
  image, but whether that's "distinct roles" or "harmless symmetry" is a judgment call. Flagged for your ear.

## Sweep findings (2026-06-20 — new variants classified)

- **applied (1):** pulling-cliff — implements the sticky-slot pattern explicitly (`pickRoles()`, L718–755): the label seeds a *new* slot only, then roles track by palm-center proximity. Code comment names this concern. A third in-the-wild instance of the fix (alongside air-guitar energy-slots and syrinx X-sort).
- **needs-patch / execute (1):** loom — `handednesses` `categoryName === 'Left'` drives distinct per-hand octave shift (left=0, right=1, L530/L549/L561). A label flip mid-play swaps octaves. Real latent bug; join the theremin/stellar-conductor batch.
- **n/a (2):** embra (PoseLandmarker, wrists by anatomical index 15/16, symmetric mapping, no handedness) and lumora (up to 4 hands, symmetric per-slot voices via SlotTracker; harvested label never branches behavior).

## ⚠ Canonical-source drift (flagged 2026-06-04)

The canonical file `air-guitar/index.html` has **uncommitted working-tree WIP** that rewrites `resolveRoles`:
the committed version uses an **energy-counter** with a `commit` hysteresis counter (`other.energy >
strumSlot.energy*1.6 ... if(++commit>7)`); the WIP replaces it with the simpler **y-margin** form
(`if(other.y > strumSlot.y + 0.03) strumSlot = other`) — which is what the *Canonical source* snippet above
already documents. So the doc currently matches the WIP, not the committed file.

`applied@v1` still holds for air-guitar and syrinx: both assign roles by *behavior*, not the handedness label,
so both satisfy the intent regardless of which hysteresis mechanism wins. But **before batch 4** (propagating
to theremin + stellar-conductor) decide which is the template — energy-counter (committed) or y-margin (WIP +
doc) — and reconcile the snippet to the chosen one. This is exactly the map-vs-file drift the ledger exists to
catch.

## Deferrals
_none yet — runecatch is needs-patch/defer, kept in the matrix rather than formally deferred._
