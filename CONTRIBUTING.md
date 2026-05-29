# Contributing to HandySynth

Thanks for building on HandySynth. This project is meant to be forked, remixed, and turned into instruments nobody has imagined yet.

## Building a variant

1. Copy `variants/_template/` to `variants/your-name/`.
2. Implement the callbacks in `variant.js` — your audio graph and visuals.
3. Theme `index.html`.
4. Serve over HTTPS (the camera requires it) and open in Chrome.

The full walkthrough — architecture, the callback interface, gesture and audio details, and the gotchas — is in [`onboarding.md`](./onboarding.md) and [`CLAUDE.md`](./CLAUDE.md).

## Two things the license asks of you

HandySynth is MIT-licensed with two added terms (see [`LICENSE`](./LICENSE)). In plain language:

- **Grant-back.** If you publicly release a variant or fork, you grant Everitt Chase a royalty-free license to use it too. You keep all your other rights.
- **Tell me what you made.** If you publicly release a variant or fork, let Everitt know — open an issue here or email the author, and point to where the work lives.

Private experiments you keep to yourself trigger neither term. These only apply once you ship something to other people.

## Submitting back

Pull requests are welcome — new variants, core improvements, docs, bug fixes. If you'd rather keep your variant in your own repo, that's fine too; just send the notification described above so it can be found and celebrated.

## Ground rules

- No build step. Keep variants to plain HTML + ES modules, served statically.
- Pin external dependencies (MediaPipe is pinned to a specific version for a reason).
- Camera access is sensitive — never add network calls that send video, landmarks, or audio off the device without making that obvious to the player.
