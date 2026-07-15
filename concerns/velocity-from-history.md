---
id: velocity-from-history
intent: Standardize one velocity-from-position-history helper for attack/flick sensitivity
why: Three variants independently built ring-buffer velocity detection three different ways (augury 6-frame posHistory, pulse 3-frame tipYHist, stellar-conductor 3-frame distHistory). One canonical helper ends the divergence and gives every gesture variant percussive-vs-legato feel.
acceptance: A fast pinch/strike sounds harder (higher attack/velocity) than a slow one; the mapping is stable frame-to-frame (no velocity spikes from single-frame jitter). Human judgment, same intent as VARIANT-POLISH #10.
detection: Search for `posHistory` / `tipYHist` / `distHistory` / per-voice velocity buffers. A variant with its OWN buffer impl is `needs-patch` (conform to canonical); a variant with no velocity sensing and a continuous attack is `needs-patch`; a variant already on the canonical helper is `applied`.
applicability: All variants where note onset has an attack/velocity parameter (melodic, percussive, plucked). N-A for purely drone/continuous variants with no discrete onset.
status:
  air-guitar: needs-patch
  augury: applied
  crystal-harp: needs-patch
  drift: n/a
  drumspace: needs-patch
  embra: n/a
  finger-guns: n/a
  fireflies: n/a
  loom: needs-patch
  lumen: applied
  lumora: applied
  pulling-cliff: applied@v0.8b
  pulse: deferred
  pyrefey-original: applied@v3.1
  runecatch: applied
  stellar-conductor: applied@v1.8b
  synesthesia: needs-patch
  syrinx: n/a
  theremin: n/a
---

## Relationship to VARIANT-POLISH

Upgrade / concrete implementation of **[VARIANT-POLISH.md](../VARIANT-POLISH.md) item #10 (Velocity
Sensitivity)**. The polish item says "do it"; this concern says "do it *this one way*" so the three
divergent impls converge.

## Canonical pattern

**2026-07-15: superseded by `site/handysynth/motion/motion.v1.js` v1.0.0 (`pushPos`/`velAt` exports, ADR
014).** Pin the shared module rather than hand-inlining a fresh copy; the pattern below is unchanged and
remains for provenance/history (motion.v1.js's version is byte-identical to this one).

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
- ~~`stellar-conductor` — `distHistory[key][0..2]` pinch-distance velocity~~ → **reconciled at v1.8b**: now uses the canonical `pushPos`/`velAt` positional helper (spawn energy from hand-motion speed at the summoning pinch, not pinch-approach distance).

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

## Sweep findings (2026-06-04)

- **applied (3):** augury (canonical reference impl); stellar-conductor (was a divergent `distHistory` reference
  impl — **reconciled to the canonical `pushPos`/`velAt` helper at v1.8b**); runecatch carries its own divergent
  buffer that already delivers velocity — counts as applied but should conform to the canonical helper on its
  next touch (tracked as a soft divergence, not a blocking patch).
- **needs-patch / execute (2):** lumen and drumspace — discrete onsets with no velocity sensing today; clean,
  high-value adds. drumspace already senses impact and should replace its bespoke delta with `velAt`.
- **needs-patch / defer (3):** synesthesia, crystal-harp, air-guitar — would benefit but the routing into each
  engine's attack is non-trivial; queue behind the execute set.
- **n/a (5):** finger-guns, theremin, drift, fireflies, syrinx — continuous/drone or no discrete attack
  parameter to drive.

## Sweep findings (2026-06-20 — new variants classified)

- **applied (1):** lumora — `pinchHist` 3-frame ring buffer → `pinchVel = pinchHist[0] - pinchDist` → onset attack `clamp(pinchVel*25, 0.2, 1)`. A genuine windowed velocity, conforms to intent.
- **needs-patch / soft-divergence (2):** loom (`pinchDistPrev` single-frame delta → note amp) and pulling-cliff (`prevGap` 2-frame delta → pluck attack). Both already deliver onset velocity, so they "work," but a 1–2 sample derivative is exactly what the canonical ring-buffer window exists to stabilize — they fail the stability half of acceptance (single-frame jitter). Conform on next touch; not blocking. Queue behind the execute set.
- **n/a (1):** embra — body-pose continuous-drone + effort-curve pluck; the onset uses EffortCurves jerk (motion velocity), not a per-note attack from a position ring buffer. No discrete attack param to drive.

## Sweep findings (2026-07-05 — pulling-cliff patched)

- **applied (pulling-cliff, v0.8b):** replaced the 2-frame `prevGap`/`prevT` derivative flagged above as a soft divergence with a capped `gapHist` ring buffer (~6 frames / ~100ms), mirroring lumora's accepted windowed `pinchHist` pattern. Onset velocity now reads the buffered span-delta instead of a single-frame delta; the buffer clears after each read. `prevGap`/`prevT` state removed as dead code.

## Deferrals

- **pulse** — justified bespoke `tipYHist` Y-only strike window. Pulse is a vertical-strike percussion model;
  a 2-axis `velAt` would add horizontal noise to a deliberately 1-axis gesture. Keep the Y-only buffer.
