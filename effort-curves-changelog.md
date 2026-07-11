# effort-curves — Changelog

Shared module, versioned per ADR 009 axis B (`EFFORT_CURVES_VERSION` constant).

## v0.2.1 — 2026-07-11

- Fix: a non-finite (`NaN`/`Infinity`) point coordinate now coasts the same
  as an invisible point instead of entering the EMA, where it would
  permanently poison `speed`/`energy` with `NaN`
- Fix: a backwards or reset `now` timestamp (caller restarts its timestamp
  origin) no longer produces negative `dt`-derived stillness or suppresses
  onsets — detected via a non-positive/non-finite `now` delta, which resyncs
  the internal clock reference, clears `_stillSince` and per-point
  `lastOnset`, and returns the previous frame's output rather than
  integrating against the bad delta

## v0.2.0 — 2026-07-10

- Add `OscillationDetector`: rhythmic 1-D oscillation (flutter/tremolo) detection over a 3.5–9 Hz band, for iterative excitation gestures

## v0.1.0 — 2026-06-12

- Initial release: per-point speed/jerk, aggregate energy, smoothness,
  stillness ramp, onset events with per-point refractory period
- Landmark-agnostic by design — proven on pose points (embra v0.1b);
  hand-variant adoption tracked in concerns/CANDIDATES.md
- Reference: pyrefey-deploy/docs/superpowers/specs/2026-06-11-lumora-fullbody-brief.md
