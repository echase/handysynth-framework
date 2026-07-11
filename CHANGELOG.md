# HandySynth Changelog

## v1.2 — 2026-07-11

### Fixes

- **Camera left running after `destroy()`** — `destroy()` now stops every
  track on the video element's `MediaStream` and clears `srcObject`. Previously
  only the `AudioContext` was closed; the webcam indicator light stayed on
  after teardown even though tracking had stopped.

- **Dead audio-blocked retry** — the overlay's `touchend`/`pointerup`/`click`
  listeners were `{once:true}`, so once the audio-blocked branch in `_start()`
  re-showed the overlay for a retry tap, the listeners had already been
  consumed and the retry tap did nothing. The listeners are now persistent
  (added once in `mount()`, tracked via `this._startHandler`) and are
  explicitly removed only once `_start()` confirms audio is running — the
  point at which the overlay is hidden for good.

- **Inverted hand roles for octave shift** — the MediaPipe handedness label
  is read from the un-mirrored camera frame while the video/canvas are
  displayed mirrored, so `label === 'Left'` was systematically backwards
  relative to what the player sees, in addition to the label's existing
  crossing/occlusion instability (concerns/two-hand-role-stability.md).
  `leftOctaveShift`/`rightOctaveShift` role assignment now uses each hand's
  on-screen (mirrored) wrist position instead of the label — the same
  X-position pattern already applied in the `syrinx` variant per the concern
  doc. `label` itself is unchanged and still keys `pinchState` and the `hand`
  field in variant callback payloads.

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
