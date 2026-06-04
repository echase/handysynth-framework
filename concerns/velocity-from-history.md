---
id: velocity-from-history
intent: Standardize one velocity-from-position-history helper for attack/flick sensitivity
why: Three variants independently built ring-buffer velocity detection three different ways (augury 6-frame posHistory, pulse 3-frame tipYHist, stellar-conductor 3-frame distHistory). One canonical helper ends the divergence and gives every gesture variant percussive-vs-legato feel.
acceptance: A fast pinch/strike sounds harder (higher attack/velocity) than a slow one; the mapping is stable frame-to-frame (no velocity spikes from single-frame jitter). Human judgment, same intent as VARIANT-POLISH #10.
detection: Search for `posHistory` / `tipYHist` / `distHistory` / per-voice velocity buffers. A variant with its OWN buffer impl is `needs-patch` (conform to canonical); a variant with no velocity sensing and a continuous attack is `needs-patch`; a variant already on the canonical helper is `applied`.
applicability: All variants where note onset has an attack/velocity parameter (melodic, percussive, plucked). N-A for purely drone/continuous variants with no discrete onset.
status:
  air-guitar: unknown
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

## Relationship to VARIANT-POLISH

Upgrade / concrete implementation of **[VARIANT-POLISH.md](../VARIANT-POLISH.md) item #10 (Velocity
Sensitivity)**. The polish item says "do it"; this concern says "do it *this one way*" so the three
divergent impls converge.

## Canonical pattern

Push `{cx, cy, t}` per tracked key each frame; on note-on, compute speed over the buffer window, clear it.

```javascript
// per-key ring buffer, capped (e.g. 6 frames)
function pushPos(buf, key, cx, cy, t, cap = 6) {
  (buf[key] ??= []).push({ cx, cy, t });
  if (buf[key].length > cap) buf[key].shift();
}
// at note-on: pixels/sec over the window
function velAt(buf, key) {
  const h = buf[key];
  if (!h || h.length < 2) return 0;
  const a = h[0], b = h[h.length - 1];
  const dt = (b.t - a.t) / 1000;
  return dt > 0 ? Math.hypot(b.cx - a.cx, b.cy - a.cy) / dt : 0;
}
// map velocity → attack/gain, then clear: buf[key] = []
```

Reference implementations (diverged — to be reconciled to the above):
- `augury` — `posHistory` + `FLICK_THRESHOLD = 600`, boolean flick at note-on.
- `pulse` — `tipYHist[0..2]` 3-frame Y-only delta for strike velocity.
- `stellar-conductor` — `distHistory[key][0..2]` pinch-distance velocity → attack intensity.

## Recipe

### class-expanded / class-minified
Hold the buffer in a script-level `{}` keyed by `${hand}_${finger}`. Push in the per-frame update; read in
`onNoteOn`; clear after read. Map velocity to the voice's attack time and/or peak gain.

### flat-module (drumspace)
Same helper; key by drum/finger id. Drumspace already senses impact — replace its bespoke delta with the
canonical `velAt`.

## Notes

- Decide a single canonical buffer cap (recommend 6 frames ≈ 100ms @60fps) and threshold scale; record the
  chosen values here once set so later sweeps measure conformance against them.
- `arch-sensitive: no` for the helper; `yes` for *where* velocity routes (per-voice attack differs by engine).
- A variant keeping a justified bespoke window (e.g. pulse's Y-only strike) may `defer` with that reason
  rather than force-conform — note it in Deferrals.

## Deferrals
_none yet_
