---
id: two-body-pose-reliability
intent: Establish where two-person `PoseLandmarker` (`numPoses: 2`) is usable on one consumer webcam, and codify the design rule that makes MediaPipe's missing cross-frame pose identity a non-issue — position-sorted anchors plus exactly swap-invariant relational scalars
why: MediaPipe returns up to N poses per frame with NO persistent identity across frames — `landmarks[0]` can silently become the other body. A relational instrument that trusts the pose index inherits a frame-rate identity flip, which is `two-hand-role-stability` at body scale and strictly worse (two independent bodies, no handedness label to even be wrong). Every future two-player / ensemble variant needs this answered once, here, not per variant.
acceptance: Feed (A,B) and (B,A) through the relational adapter and every scalar is bit-identical; anchors position-sort leftmost=A every frame; a pose-index flip mid-stream moves no anchor. Live: two bodies hold two distinct poses across the intended playing range, and swap/merge rates are recorded rather than assumed.
detection: Search for `sortAnchors` / `numPoses: 2` / a swap-invariance test. A two-body variant that indexes `results.landmarks[0]`/`[1]` into fixed roles without position-sorting = needs-patch.
applicability: Variants tracking two or more bodies from one camera (between; future ensemble/relational work). N/A for all 18 current board variants — every one is single-body (`numPoses: 1`) or hand-scale.
status:
  between: applied@v0.1b (synthetic + headless-live evidence; the two-body range map below is UNFILLED pending a two-person session)
---

## Provenance

Phase 0 spike output for Between v0.1b (2026-07-17), the catalog's first
two-player instrument. Runner:
`site/handysynth/between/spike/between-spike.mjs` (Pyrefey repo, branch
`feat/between-v0.1b`); live probe: `site/handysynth/between/spike/probe.html`.

**No second human was available this session, and the real gate needs two
bodies in frame.** Per the Slingtone protocol the mode decision rides the
synthetic evidence plus a headless live run, and the range map below is
explicitly unfilled. The probe ships self-serve so the session that has two
people can fill it without re-deriving anything.

## The finding that matters

**Design for swap-invariance and the identity problem stops gating.**

The spike was chartered to measure index-swap frequency, on the assumption that
a swap-prone tracker would force a design change. It does not — because a
relational design can be made *immune* to the swap rather than robust to it:

- **Position-sort every frame.** Leftmost anchor is A. The pose index is never
  read. A swap becomes a no-op by construction, not by tolerance.
- **Keep every relational scalar symmetric in (A,B).** Separation, midpoint and
  synchrony are symmetric outright. Mirroring is *exactly* swap-invariant:
  reflecting B's velocity across the vertical axis preserves norms, and the dot
  product is symmetric under the swap, so `mirroring(vA,vB) === mirroring(vB,vA)`
  to the last bit — not approximately.

Measured, not asserted: feeding (A,B) and (B,A) through the adapter yields
`max |Δ| == 0` across separation, synchrony, mirroring and convergence, over
every fixture (converge / mirror / sync / soloist). A pose-index flip forced
every frame moves anchor A by `< 1e-9`.

Consequence for the gate: the spec's first two outcomes — *"two poses stable,
swaps rare"* → duet-full, and *"stable but swaps often"* → duet
symmetry-hardened — **ship the identical artifact**. Only *"unreliable at any
usable range"* changes the build, and then only which mode is the default. A
future relational variant that adopts both rules above inherits the same
immunity and can treat the swap row as informational.

## Gate decision — Between v0.1b

**Duet-full, symmetry-hardened. PROVISIONAL** pending the two-person felt
play-test. Solo (one body, two wrists) is the automatic fallback, not an error
state.

| Evidence | Source | Verdict |
|---|---|---|
| Whole relational engine, all relations classify | 36-check synthetic scorecard | all pass |
| Swap invariance | 4 fixtures × 4 scalars, every frame | exact (`Δ == 0`) |
| Dyad purity (lone mover excites nothing) | soloist fixture | leakage `0.000` |
| Survives 2–4× pose noise at 25 fps | jitter overlays σ 0.004 / 0.008 | mirror 0.87, sync 0.95 |
| `numPoses: 2` pipeline initializes and runs | headless Chrome, fake device | 309 frames, no errors |
| No phantom second pose from non-human input | headless Chrome, fake device | 0 poses / 309 frames |
| Loss → floor tone, no cut, no stuck drone | headless live + fixtures | separation → 1.00 |
| **Two bodies at real range** | — | **NOT OBTAINED** |

What would overturn it: a two-person probe run showing two-pose tracking
unusable at every playable distance. That flips the default to solo-first
(`?duet=1` experimental) and touches nothing else — the anchors, scalars,
audio and visuals are mode-agnostic.

## Platform facts established

| Fact | Value | Source |
|---|---|---|
| Stack | tasks-vision `0.10.18`, `pose_landmarker_lite` float16, GPU delegate, `runningMode: 'VIDEO'` | probe |
| `numPoses: 2` accepted, no crash | yes | headless run |
| Detection cadence, M1 Pro | ~25 fps sustained (60 fps rAF) | headless run, 309 frames |
| Phantom poses from non-human input | none | headless run |
| Segmentation masks | off — never requested, don't pay for them | probe config |
| Anchor of choice | shoulder-midpoint centroid (landmarks 11/12), invisible only when BOTH shoulder visibilities `< 0.5` | derived from tremolo-garden palm-centroid logic at torso scale |
| Solo anchors | that body's wrists (15/16); identical downstream math | probe |

## The range map — UNFILLED

The four questions the spec chartered, still open. `probe.html` instruments all
four live and exports a JSON report; **Mark range** stamps counts against a
labelled distance.

| Range | Two poses hold | Index swaps | Crossing collapses to one | Notes |
|---|---|---|---|---|
| shoulder-to-shoulder | ? | ? | ? | expect merge risk highest here |
| arm's length | ? | ? | ? | |
| ~2 m apart | ? | ? | ? | the intended duet width |
| across the room | ? | ? | ? | expect dropout / range exit |
| crossing over | ? | ? | ? | expect transient one-body |
| one player exits | ? | ? | ? | should degrade to solo, not error |

To fill: serve the variant, open
`/handysynth/between/spike/probe.html?NDA=agreed` in Chrome with two people,
walk the ranges, **Mark range** at each, **Copy report**, and paste the JSON
under a `## Live findings (<date>)` heading here.

## Recipe

```javascript
// 1. Never trust the pose index — position-sort every frame.
const [a, b] = p0.x <= p1.x ? [p0, p1] : [p1, p0];

// 2. Anchor on the shoulder-midpoint centroid, not a distal limb.
//    Visible unless BOTH shoulders fall below the visibility floor.
const anchor = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2,
                 visible: (ls.visibility ?? 1) >= 0.5 || (rs.visibility ?? 1) >= 0.5 };

// 3. Keep relational scalars symmetric, then TEST the symmetry as a law.
//    Feed (A,B) and (B,A); assert bit-identical output.

// 4. Treat crossing/merge as a transient one-body case: coast the last
//    separation (~350 ms), then collapse to the floor — never a cut.
```

Recommended One-Euro on the **anchors** (before derivation, never on
downstream signals): `minCutoff 1.0`, `beta 0.007`, `dCutoff 1.0` — body-scale
motion is slower than hand-scale. `reset()` on pose-loss `> 400 ms` and on
pause. Source the filter from `motion.v1.js` (ADR 014) rather than
hand-inlining; that is what closes `one-euro-smoothing` and
`velocity-from-history` for the variant.

> [!note]
> Speed envelopes for interpersonal-phase work want `pushPos`/`velAt`
> (`velocity-from-history`), not raw single-frame deltas: a span-smoothed speed
> is what makes the correlation readable at 25 fps.

## Single-camera limits

- **No depth.** Separation is image-plane distance, so two bodies at different
  distances from the camera read as "close" when they overlap horizontally. The
  instrument tolerates this (it prices *relation*, not metric distance), but a
  variant needing true proximity cannot get it from one camera.
- **No identity.** Nothing carries a body across a full occlusion. Position-sort
  handles frame-to-frame; a body that leaves and returns is simply a new anchor.
- **Occlusion is collapse, not error.** Two bodies crossing merge to one pose.
  Coast, don't cut.
- **Frame is the hard limit on duet width.** Two people far enough apart to feel
  "distant" may not both fit at typical webcam FOV — the usable range ceiling is
  the lens, not the model.

## Deferrals

- N-body: rank pairwise separations, closest pair frames the dyad (Guiard
  coarseness generalization). Needs this map filled first.
- Cross-frame body re-identification (appearance embedding) — out of scope for
  a single-camera on-device instrument.
- Networked two-camera Between: sidesteps the frame-width ceiling entirely and
  makes this concern moot for that path.
