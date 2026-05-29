# HandySynth

A platform for building spatial hand-tracked musical instruments in the browser.

Your camera tracks hand gestures in 3D via MediaPipe. The core platform handles tracking, gesture detection, and pitch mapping. You build the instrument — the sounds, the visuals, the interaction model — as a variant.

## Quick Start

```bash
# Serve locally (HTTPS required for camera)
npx serve .

# Open a variant
# http://localhost:3000/variants/pyrefey/
```

## Structure

```
handysynth.js          Core platform
variants/
  _template/           Copy to start a new instrument
  pyrefey/             Fire wizardry / fey magik (first variant)
```

## Building a Variant

1. Copy `variants/_template/` → `variants/your-name/`
2. Implement `onInit`, `onNoteOn`, `onNoteUpdate`, `onNoteOff`, `onFrame` in `variant.js`
3. Theme `index.html`

See `CLAUDE.md` for the full callback interface and architecture docs.

## Included Variant: Pyrefey

Spatial synthesizer with per-finger voice identities, FM synthesis, 6 particle systems, sacred geometry, fire trails, and Elder Futhark rune glyphs. See `variants/pyrefey/`.

## Stack

- MediaPipe Tasks Vision (HandLandmarker) — hand tracking
- Web Audio API — synthesis
- Canvas 2D — visuals
- Zero build dependencies

## Docs

- [`onboarding.md`](./onboarding.md) — full architecture walkthrough, gesture/audio internals, gotchas
- [`CLAUDE.md`](./CLAUDE.md) — core API: the `HandySynth` class, callback interface, constructor options, scales
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — how to build and submit a variant

## License

MIT, with two added terms (see [`LICENSE`](./LICENSE)):

- **Grant-back** — anything you publicly release on top of HandySynth grants Everitt Chase a perpetual, royalty-free license to use it too. You keep all your other rights.
- **Notification** — if you publicly release a variant or fork, tell Everitt what you made (open an issue here or email the author). Private experiments trigger neither term.

## Built something?

Open an issue on this repo describing your variant and where it lives, or send a pull request to add it to the catalog. Builders are expected to send this notification under the license — and it's the best way to get your instrument seen.
