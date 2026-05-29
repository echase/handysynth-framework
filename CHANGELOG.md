# HandySynth Changelog

## v1.1 — 2026-05-29

### Fixes

- **iOS Safari silence bug** — `_initAudio()` is now `async`. `audioCtx.resume()` is
  awaited during the initial user gesture, and a silent warm-up buffer is played
  immediately after to fully unlock the WebAudio graph on iPhone/iPad. Calling
  `resume()` inside a `requestAnimationFrame` loop is too late for iOS; it must
  happen synchronously within the trusted gesture callstack.

- **Double-start prevention** — `_start()` now sets `this._startCalled = true` on
  first invocation and returns early on any subsequent call. This is necessary
  because `touchend`, `pointerup`, and `click` can all fire for a single tap on iOS,
  and all three listeners are now registered.

- **Frame-loop resume removed** — The `audioCtx.state === 'suspended'` check in
  `_processFrame()` has been replaced with a comment. Audio is now fully unlocked
  during `_initAudio()` and the frame-loop call was misleading and ineffective on iOS.

### Added

- **Mobile gesture listeners** — `mount()` now registers `touchend` (with
  `passive: false` to allow `preventDefault`), `pointerup`, and `click` on the overlay
  element alongside the previous click-only listener. The `_startCalled` guard
  prevents double-fire.

- **Audio-blocked fallback** — If `audioCtx.state !== 'running'` after `_initAudio()`
  returns, `_start()` re-shows the overlay with a "tap again or check silent mode"
  message and resets the guard, giving the user a second attempt.

- **Universal Polish Standard** — `VARIANT-POLISH.md` documents 13 mandatory UX
  refinements (EMA motion smoothing, cursor particles, immersive mode, spacebar pause,
  help overlay, auto-pause, toast system, etc.) that every shipped variant must include.
  See `VARIANT-POLISH.md` for the full checklist and reference implementation.

- **Safari-Silence-Fix.md** — Handoff document recording the diagnosis and full
  prescription for the iOS audio unlock issue, in a format suitable for delegating
  to Codex or another Claude session.

---

## v1.0 — 2026-05-28

- Initial public release of the HandySynth Core Platform.
- `HandySynth` class with gesture detection, hand tracking, pinch hysteresis, depth
  estimation, pitch/scale mapping, and startup orchestration.
- `SCALES` export with 15 built-in tunings (pentatonic through chromatic + world scales).
- Variant callback interface: `onInit`, `onNoteOn`, `onNoteUpdate`, `onNoteOff`,
  `onFrame`, `onResize`, `onDestroy`.
- Pyrefey variant and `_template/` skeleton for forking.
