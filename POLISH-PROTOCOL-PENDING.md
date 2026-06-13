# Polish Protocol v2 — pending enhancements

**Status:** prototyping on **theremin** (uncommitted). Fold into [VARIANT-POLISH.md](VARIANT-POLISH.md)
once the feel is settled, then fan out to all variants via the batch-1 parallel-agent apparatus.

→ source of the clap mechanism: `~/Apps/PagePinch/cruise-wall.html` (`detectClap`)

## Enhancements

### #14 Clap-to-pause (NEW item)

Two open hands clapped together toggle pause; **spacebar stays as the universal alternate**.

- **Mechanism** (ported from PagePinch): track distance between the two hands' palm centers; on a fast
  *closing* velocity crossing a distance threshold (and no active pinch, past a cooldown) → toggle pause.
  Hysteresis: re-arm only after the hands separate past a release distance.
- **Must run before the pause gate** so a clap can also **resume** (detector independent of the audio/draw freeze).
- **Caveat — occlusion:** when hands meet they overlap and MediaPipe drops one. PagePinch survives via slot
  *coasting* (`lostGrace`); raw per-frame hands do not. Mitigation in the prototype: fire during the fast
  approach (looser `dist`, lower `vel`). **Codification decision:** add lightweight two-hand coasting to the
  standard, or keep the looser-threshold approach per variant.
- **Constants are camera/framing-dependent** — expose a `CLAP` config; tune per variant. Prototype ships a
  debug HUD (toggle `c`) showing live `hands / d / vel / latch / clap1 / win / lost`.
- **Attempt #4 — occlusion-AS-contact (2026-06-05).** Prior tries detected the clap while *both* hands were
  visible, but contact = occlusion = MediaPipe drops a hand. Now a sustained fast convergence (`convergeFrames`)
  that then collapses to <2 hands counts as the impact. Window widened 650→1200ms (a watched clap-clap is
  700–1000ms apart + re-acquisition latency; 650 made the second impact re-enter the first-clap branch and
  never toggle — "clap1 hits 1, never fires"). HUD now discriminates the 3 failure paths: `win`=0 → window
  lapsed; `lost` climbing → occlusion ate it; `latch` stuck → hands never separated past `releaseDist` to re-arm.
- **⚠ Tripwire:** single-clap demonstrably worked earlier ("clap is good"); clap-clap has failed 3×. If attempt
  #4 still fails the HUD test, **do not tune a 5th time** — surface "single-clap-with-guard vs clap-clap" to the
  operator as a design choice. The guard against false single-claps (e.g. during effect-hand play) is the open
  question either way.

### #7 Help overlay — upgrade

- **Fills the viewport**, scrolls if content overflows; body text **≥ 16pt** (`clamp` floor, scales up).
- Triggered by `?` / `/` **and** an on-screen `?` badge that is **hover-lit** and opens the help **on click**
  ("full screen" = viewport-filling overlay, *not* the browser Fullscreen API).
- Dismiss: **X** icon + **Esc** + backdrop click + any key.

### #6 / #8 Pause semantics — tighten

Pause (from **any** trigger — clap, spacebar, auto-inactivity) must:

1. **Immediately silence audio** — click-free ramp to 0 at the **master bus**, covering continuous/drone voices
   too (not just discrete note-offs). The old per-note-off-only pause left continuous tones ringing.
2. **Freeze camera tracking** — stop drawing the live skeleton/hand overlays; the instrument stops responding.

**Open question (power vs resume):** fully suspending MediaPipe inference saves CPU/GPU but breaks
clap-to-resume (which needs the detector alive). Decide: keep inference alive while paused, or suspend it for
spacebar/auto-pause and keep it only when clap-resume is enabled.

### #3 Mouse cursor — make universal

Every variant needs a moving-cursor indicator (pyrefey-style trail). Missing in **finger-guns, pulling-cliff,
syrinx**. **Verify before forcing it in** — finger-guns already indicates the cursor via its aim reticle;
don't clobber a bespoke affordance.

## Prototype reference

`site/handysynth/theremin/index.html` (uncommitted) — all four above. Debug HUD: press `c`.
