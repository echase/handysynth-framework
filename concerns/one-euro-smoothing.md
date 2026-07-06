---
id: one-euro-smoothing
intent: Replace fixed-k EMA landmark smoothing with the velocity-adaptive One-Euro filter
why: Fixed-k EMA (VARIANT-POLISH #1) forces one trade-off — smooth-but-laggy or responsive-but-jittery. One-Euro adapts per frame: heavy smoothing when the hand is still (kills jitter), light smoothing when it moves fast (kills lag). Proven in finger-guns aim.
acceptance: Holding a steady pinch produces a rock-stable value (no warble); fast gestures track with no perceptible lag/rubber-banding. Human judgment, same test as VARIANT-POLISH #1.
detection: Search for `class OneEuro` / `euroX` / `mincutoff`. Absent = still on fixed-k EMA (PITCH_SMOOTH_K etc.) → needs-patch.
applicability: All variants that smooth hand landmarks before mapping to audio/visual params — i.e. every instrument variant. N-A only if a variant deliberately uses raw landmarks (none known).
status:
  air-guitar: needs-patch
  augury: needs-patch
  crystal-harp: needs-patch
  drift: needs-patch
  drumspace: needs-patch
  embra: needs-patch
  finger-guns: applied@v2
  fireflies: needs-patch
  loom: needs-patch
  lumen: needs-patch
  lumora: applied@v0.33b
  pulling-cliff: applied@v0.8b
  pulse: n/a
  pyrefey-original: applied@v3.2
  runecatch: needs-patch
  stellar-conductor: n/a
  synesthesia: needs-patch
  syrinx: deferred
  theremin: needs-patch
---

## Relationship to VARIANT-POLISH

This is an **upgrade to [VARIANT-POLISH.md](../VARIANT-POLISH.md) item #1 (Motion Smoothing)**, not a new
axis. A variant that adopts One-Euro still satisfies #1 — better. The fixed-k constants (`PITCH_SMOOTH_K`,
`Y_SMOOTH_K`, `Z_SMOOTH_K`) are replaced by per-signal `OneEuro` instances.

## Canonical source

`site/handysynth/finger-guns/index.html` — `class OneEuro` (input abstraction layer) + per-axis use in the
aim path.

```javascript
class OneEuro {
  constructor(mincutoff = 1.0, beta = 0.007, dcutoff = 1.0) {
    this.mincutoff = mincutoff; this.beta = beta; this.dcutoff = dcutoff;
    this.xPrev = null; this.dxPrev = 0; this.started = false;
  }
  _alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
  filter(x, dt) {
    if (!this.started) { this.started = true; this.xPrev = x; this.dxPrev = 0; return x; }
    const dx = (x - this.xPrev) / dt;
    const aD = this._alpha(this.dcutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    const cutoff = this.mincutoff + this.beta * Math.abs(dxHat);
    const a = this._alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat; this.dxPrev = dxHat;
    return xHat;
  }
  reset() { this.started = false; }
}
```

Usage (per smoothed signal, dt = 1/60):

```javascript
const sx = euroX.filter(rawX, 1 / 60);   // was: smoothedPx += (rawPx - smoothedPx) * PITCH_SMOOTH_K
```

## Recipe

Architecture-agnostic — `OneEuro` is plain JS, drops into all three shapes. The wiring differs only in
where per-signal state lives.

### class-expanded / class-minified
Add `OneEuro` near the top of the variant script. Replace each `smoothedP*[key] += …` accumulation with a
per-key `OneEuro` instance (one per axis per voice/finger). Tunables: start `mincutoff≈1.0`, `beta≈0.007`;
raise `beta` if a fast gesture lags, lower `mincutoff` if a held pose still warbles.

### flat-module (drumspace)
Same class; store instances in the per-voice/per-finger state object instead of class fields.

## Notes

- `reset()` on pause/hand-loss to avoid a jump when tracking resumes — pairs with VARIANT-POLISH #5.
- `arch-sensitive: no` for the filter itself; only the per-voice state plumbing varies.
- The sweep should confirm the variant currently uses fixed-k EMA (detection) before patching, and re-tune
  per variant since pitch axes need more smoothing than volume/trigger axes.

## Sweep findings (2026-06-04)

- **needs-patch (10):** air-guitar, augury, crystal-harp, drift, drumspace, fireflies, lumen, runecatch,
  synesthesia, theremin — all on fixed-k EMA. augury is class-minified (anchor strings have no spaces — patch
  must match minified tokens). theremin & crystal-harp are continuous-pitch → highest payoff.
- **n/a (2):** pulse and stellar-conductor smooth percussion/conducting signals where adaptive landmark
  smoothing doesn't apply (no held-pitch warble to kill).
- **applied (1):** finger-guns (canonical source).

## Sweep findings (2026-06-20 — new variants classified)

Four variants added since the first sweep, all on fixed-k EMA → **needs-patch**:
- **embra** — fixed-k `T.emaPos` on pose wrists (`s.x += (l.x - s.x) * T.emaPos`); continuous wrist-x→freq and height→vol axes warble at low speed.
- **loom** — `TIP_SMOOTH_K = 0.10` accumulation; continuous-pitch → high payoff.
- **lumora** — fixed-α `T.emaPos` / `T.emaOpen` on up-to-4 hands; continuous freq/force/openness.
- **pulling-cliff** — fixed-k EMA (α=0.18) on the pitch axis.

## Sweep findings (2026-07-05 — pulling-cliff patched)

- **applied (pulling-cliff, v0.8b):** replaced the fixed-k EMA (α=0.18) on the pitch axis with a `pitchEuro = new OneEuro(1.0, 0.007, 1.0)` instance, reset alongside hand-loss and pause per the existing `reset()` convention. Canonical `OneEuro` class copied verbatim from finger-guns, no deviation.

## Deferrals

- **syrinx** — bespoke architecture with a hand-tuned manual EMA already in place. Conforming would mean
  rewriting a working bespoke smoother for no audible gain. Revisit only if syrinx is refactored onto the
  HandySynth core.
