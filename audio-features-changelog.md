# audio-features changelog

## v0.1.0 — 2026-07-17

Initial release. AnalyserNode → per-frame feature object for music-driven
variants (first consumer: tuneflow v0.1b).

- Fast tier: 8 log-spaced band energies (60 Hz–8 kHz), per-band spectral-flux
  onsets (adaptive threshold, 80 ms refractory), normalized RMS, spectral centroid
- Slow tier (~5 s outputs): IOI-mode tempo, arousal (tempo × loudness),
  valence (centroid + onset regularity) — palette-drift grade, deliberately crude
- Slow peak normalizer (~10 s half-life): all outputs relative 0–1
- Spec: docs/superpowers/specs/2026-07-10-tuneflow-design.md
