---
id: two-hand-role-stability
intent: Assign two-hand roles by motion/position behavior, not MediaPipe's Left/Right label
why: MediaPipe's handedness label flips when hands cross or on brief occlusion. Any variant that gives the two hands DISTINCT roles (lead/accompaniment, pitch/dynamics, fret/strum, different voices per hand) glitches when the label swaps mid-performance. air-guitar fixed this with sticky, energy-based role assignment that coasts through dropouts. This is a latent BUG class, not a feature.
acceptance: Cross the hands, or briefly occlude one, while playing a two-role gesture — roles stay put, no voice/parameter swap, no dropped note. No flicker when hands pass near each other.
detection: Search for reliance on `handedness` / `category` / `=== 'Left'` / `=== 'Right'` to choose a hand's role. Presence = needs-patch (or verify it's robust). air-guitar's `trackHands`/`resolveRoles` sticky-slot pattern = applied.
applicability: ONLY variants where the two hands have distinct roles. N-A where each hand is independent and symmetric (same mapping regardless of which hand) — there a label swap is harmless. The sweep must classify each variant's two-hand model before deciding.
status:
  air-guitar: applied@v1
  augury: unknown
  crystal-harp: unknown
  drift: unknown
  drumspace: unknown
  finger-guns: unknown
  fireflies: unknown
  lumen: unknown
  pulse: unknown
  runecatch: unknown
  stellar-conductor: unknown
  synesthesia: unknown
  syrinx: unknown
  theremin: unknown
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

## Deferrals
_none yet_
