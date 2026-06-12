# HandySynth — Project Index

Living document. Update this when artifacts are created, decisions are made, or the roadmap shifts.

## What Exists

### Core Platform
| File | Status | Description |
|------|--------|-------------|
| `handysynth.js` | v1.1 stable | Gesture detection, hand tracking, pitch mapping, startup orchestration. iOS Safari audio fix applied. |
| `effort-curves.js` | v0.1.0 | Landmark-agnostic effort features (energy, smoothness, stillness, onsets). Node-tested. First consumer: embra. |
| `CLAUDE.md` | Current | Architecture spec, callback interface, constructor options, constraints |

### Variants
| Variant | Status | Description |
|---------|--------|-------------|
| `pyrefey/` | v2.1 stable | Fire wizardry theme. 4 per-finger voices (Sigil/Ember/Crystal/Howl), FM synthesis, 6 particle systems, sacred geometry mandala, convergence arc |
| `_template/` | Ready | Annotated skeleton for forking new variants |

### Docs
| File | Audience | Description |
|------|----------|-------------|
| `CLAUDE.md` | Claude / devs | Architecture reference — the primary context doc |
| `VARIANT-POLISH.md` | Claude / devs | The 16-item mandatory UX polish standard (v1.2) |
| `VARIANT-SCREENING.md` | Claude / devs | Pre-pipeline screening rubric for variants landing in `drop/` — 3 tiers + ranked-refinement report |
| `POLISH-FANOUT-HANDOFF.md` | Claude / devs | Serial runbook for applying the polish standard across remaining variants, folding learnings into the standard each pass, operator-gated |
| `README.md` | Humans | Quick-start and project overview |
| `onboarding.md` | Devs | Deep Pyrefey walkthrough (pre-refactor, partially outdated — audio/visual sections still accurate, gesture sections superseded by core) |

## Key Decisions

| Decision | Rationale | Origin |
|----------|-----------|--------|
| MediaPipe Tasks Vision API, not legacy `@mediapipe/hands` | Legacy package has unreliable CDN loading; Tasks Vision is Google's maintained path | Origin conversation — "no hand recognition" debugging |
| Click-to-start overlay | AudioContext requires user gesture; camera needs user-initiated context | Origin conversation |
| Reversed pitch (physical right = higher) | Matches keyboard orientation in mirrored camera view | Origin conversation |
| Per-finger voice identity (not switchable modes) | Each finger IS an instrument — richer simultaneous texture | Origin conversation |
| Z-axis via exponential curves, not linear | Compensates for MediaPipe's weak Z signal; amplifies usable range, compresses noise | Origin conversation |
| Scale signal > landmark Z for depth | 2D landmark positions have sub-pixel precision; landmark Z is learned inference with ~4 usable discrete zones | Origin conversation |
| Effort curves over coordinates for body-scale input | Musicality is embodied — map motion qualities (energy/stillness/onsets), not joint positions; pose landmark identity is anatomical so no slot matching needed | 2026-06-11 body-motion handoff → embra |
| Core/variant split | Gesture pipeline is reusable; audio/visuals are variant-specific. Enables fork-and-build workflow | Origin conversation — refactor discussion |
| No build step | Files served directly, CDN dependencies at runtime. Reduces friction for forking | Origin conversation |

## Roadmap

### v2 Core (next)
- [ ] Raw spatial payloads as primary (`x, y, z, cx, cy, landmarks`), freq/vol/depth as opt-in convenience
- [ ] Adaptive depth estimator — percentile windowing over rolling N-second window (5th/95th percentile, not absolute min/max)
- [ ] Scale-derived velocity signal — frame-to-frame hand scale delta as dynamics/attack axis
- [ ] Passive calibration — running envelope that auto-widens, no user action needed
- [ ] Optional active calibration sweep — "move close to far" prompt, locks range, stores in localStorage

### Gesture Vocabulary Expansion
- [ ] Finger curl detection (extension angle from 3-joint chain)
- [ ] Palm rotation (wrist-to-MCP plane normal)
- [ ] Hand velocity + direction (frame-delta of landmark centroid)
- [ ] Finger splay (inter-fingertip distances when extended)
- [ ] Two-hand relationships beyond convergence (relative height, symmetry, clap detection)
- [ ] Trajectory tracking (sliding window of landmark paths — circles, sweeps, conducting)
- [ ] Finger sequencing (pinch order detection for arpeggios/strums)
- [ ] Zone mapping (spatial regions as control surfaces)

### Variant Ideas
- [ ] Theremin — single-finger continuous pitch, no pinch needed, Y=volume
- [ ] Drum machine — palm-strike detection, percussion samples, grid sequencer
- [ ] Ambient pad — full-hand open/close gesture, granular synthesis
- [ ] Harp — strum detection across sequential finger pinches
- [ ] Loop station — record + overdub gestures, visual loop waveform

## Conversation Log

| Conversation | Topics | Key Outputs |
|-------------|--------|-------------|
| Origin | AirSynth v1 → Pyrefey v2.1 → HandySynth platform refactor | `handysynth.js`, `pyrefey.js`, variant template, CLAUDE.md, onboarding.md, deploy package, roadmap |
| 2026-05-29 | v1.1: iOS Safari audio fix + 13-item polish standard | `VARIANT-POLISH.md`, `Safari-Silence-Fix.md`, CHANGELOG.md, v1.1 core patch, 12 catalog variants patched |

*Update this table as new conversations produce artifacts or decisions.*
