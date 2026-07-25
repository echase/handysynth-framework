# Universal Variant Polish Standard

**Version:** 1.2
**Date:** 2026-06-06
**Status:** Active
**Scope:** Mandatory UX features for all HandySynth/Pyrefey variant builds

---

## Purpose

Every variant shipped through the catalog must include these interaction refinements. They ensure a consistent, professional feel regardless of the audio engine or visual theme. When generating a new variant or upgrading an existing one, apply all items below.

---

## Changelog

**v1.2 (2026-06-06)** — sharpened on `pulling-cliff` (first fan-out pass against the folded standard):
- **#15 veil-ceiling clarification.** The ≤0.18 per-frame veil ceiling was being read as a blanket cap, but it only applies when chrome is *canvas-drawn* (the veil and the text dimmer multiply). Where chrome is **DOM-layered above the canvas** at a higher z-index, the veil dims the camera feed *behind* the text and does **not** stack with DOM opacity — a heavier veil that's part of the visual identity (pulling-cliff's 0.30 oscilloscope persistence trail) is fine; fix only the DOM chrome opacities. Acceptance wording sharpened in §15's Note; no new item. This resolves a false "veil over floor" gap the screen would otherwise flag on every DOM-chrome variant.

**v1.1 (2026-06-05)** — prototyped on `theremin`, codified for fan-out:
- **#6 Pause** rewritten: silence at the **master bus** (covers continuous/drone voices, which per-note-off left ringing) + **freeze the skeleton draw** + restore an intended-volume on resume.
- **#7 Help** rewritten: **full-viewport** overlay, ≥16pt floor with scroll, hover-lit on-screen `?` **badge**, and X/Esc/backdrop/any-key dismissal.
- **#8 Auto-pause** aligned to the master-bus mute path.
- **#3 Cursor** sample corrected to swap-and-pop; coverage gap + bespoke-affordance caveat noted.
- **New #14** Click-free audio ramps · **New #15** UI contrast floor · **New #16** Swap-and-pop in hot loops.
- **Provisional P1 split:** P1 now has two tiers — **P1a single-clap-to-unpause** (universal once verified; low false-positive cost while already paused) vs **P1b double-clap-to-toggle-pause** (variant-conditional; higher false-positive risk mid-performance). A variant may adopt P1a without P1b when the layout or gesture vocabulary makes a false-pause unacceptable.
- **Reference:** gesture-vocabulary primitives (twist / openness / depth axes) now live in `handysynth-foundation/CLAUDE.md`; pointer added below.
- **Refined against the stellar-conductor procedure test** (before fan-out): #6 — master-bus ramp is load-bearing for autonomous/drone voices, `setPaused` is the single source of truth, full-`onFrame`-freeze counts; #7 — badge position is per-variant (clear the densest chrome corner, not always "above the legend"); #14 — mostly an audit, the usual gap is the pause; #15 — raise only what's below floor (don't blind-edit an already-OK veil).

---

## Polish Items

### 1. Motion Smoothing (EMA Filtering)

**What:** Per-axis exponential moving average on hand landmark positions before mapping to audio parameters.

**Why:** Raw MediaPipe landmarks jitter ±2–5px frame-to-frame. Without smoothing, pitch and volume flutter audibly.

**Acceptance:** Holding a steady pinch in one position produces a stable tone — no audible warble, no visible fingertip jitter in the rendered hand.

**Parameters:**
```javascript
const PITCH_SMOOTH_K = 0.05;  // X-axis: ~0.3s to settle (pitch needs stability)
const Y_SMOOTH_K     = 0.08;  // Y-axis: volume
const Z_SMOOTH_K     = 0.08;  // Z-axis: depth/filter

// Per-voice state (initialize per finger key)
smoothedPx[key] += (rawPx - smoothedPx[key]) * PITCH_SMOOTH_K;
smoothedPy[key] += (rawPy - smoothedPy[key]) * Y_SMOOTH_K;
smoothedPz[key] += (rawPz - smoothedPz[key]) * Z_SMOOTH_K;
```

---

### 2. Clean Hand Rendering (No Persistence Trails)

**What:** Canvas partially clears each frame with a semi-transparent fill rather than full `clearRect`. Hand skeleton/model draws fresh every frame (no ghost trails).

**Why:** Full clearRect makes particles vanish instantly (too harsh). Naive trail persistence (never clearing) leaves hand skeletons smeared across the canvas.

**Acceptance:** Particles fade gracefully over multiple frames. Hand skeleton/model appears crisp with no ghosting.

**Implementation:**
```javascript
// In draw loop — clears with subtle fade (tweak alpha per variant aesthetic)
ctx.fillStyle = 'rgba(6,6,11,0.14)';
ctx.fillRect(0, 0, W, H);

// Hand drawing happens AFTER this fill — always fresh
drawHands(W, H);
```

**Note:** The fill color and alpha should match the variant's background. Darker alpha = longer particle trails. Hand rendering must always be per-frame (no accumulation).

---

### 3. Mouse Cursor with Trailing Particles

**What:** Hide the native cursor over the canvas. Replace with dynamic particle emitter that spawns on mouse movement and fades/drifts.

**Why:** A raw arrow cursor breaks immersion. The particle trail matches the variant's visual language and gives satisfying feedback when navigating.

**Acceptance:** Native cursor invisible over canvas. Moving mouse produces themed trailing particles. Particles fade and drift (not frozen dots). Mouse leaving canvas stops particle spawn.

**Implementation:**
```javascript
// CSS
canvas { cursor: none; }

// State
const CURSOR_PARTICLES = [];
const MAX_CURSOR = 30;
let mouseX = -100, mouseY = -100, mouseVisible = false;

// Event listeners
canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX; mouseY = e.clientY;
  mouseVisible = true;
  if (CURSOR_PARTICLES.length < MAX_CURSOR) {
    CURSOR_PARTICLES.push({
      x: mouseX + (Math.random() - 0.5) * 4,
      y: mouseY + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 0.8 - 0.2,
      size: Math.random() * 2 + 0.5,
      life: 1,
      decay: 0.03 + Math.random() * 0.02,
    });
  }
});
canvas.addEventListener('mouseleave', () => { mouseVisible = false; });

// Tick in draw loop
function tickCursorParticles() {
  for (let i = CURSOR_PARTICLES.length - 1; i >= 0; i--) {
    const p = CURSOR_PARTICLES[i];
    p.x += p.vx; p.y += p.vy; p.life -= p.decay;
    // swap-and-pop (see #16) — descending loop, order irrelevant
    if (p.life <= 0) { CURSOR_PARTICLES[i] = CURSOR_PARTICLES[CURSOR_PARTICLES.length - 1]; CURSOR_PARTICLES.pop(); continue; }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,160,80,${(p.life * 0.3).toFixed(3)})`;
    ctx.fill();
  }
}
```

**Variant adaptation:** Change particle color, drift direction, and size to match the variant palette. Bird variants might use feather-drift physics; water variants might use droplet gravity.

> [!warning] Coverage gap + bespoke-affordance caveat
> Known **missing** in `finger-guns`, `syrinx` — sweep targets. (`pulling-cliff` has carried a themed cursor-particle trail since v0.2b — cleared 2026-07-25.) But **verify before forcing it in**: `finger-guns` already indicates the cursor via its aim reticle. Don't clobber a variant's bespoke cursor affordance with the generic trail — mark it `n/a` with a one-line reason instead.

---

### 4. Immersive Mode (Mouse-Idle UI Auto-Hide)

**What:** UI controls (sliders, buttons, labels) fade out after ~3 seconds of no mouse movement. Mouse movement instantly restores them.

**Why:** During performance, UI chrome is distracting. Players interact with hands, not mouse. UI should be available but not intrusive.

**Acceptance:** Move mouse → UI fully visible. Stop moving mouse → UI fades within 3 seconds. Move mouse again → UI instantly restores. UI elements use CSS transition for smooth fade.

**Implementation:**
```javascript
// State
let lastMouseMove = 0, uiVisible = true;
const UI_HIDE_DELAY = 3000; // ms

// In mousemove handler (combine with cursor particle handler)
lastMouseMove = performance.now();
if (!uiVisible) {
  uiVisible = true;
  document.querySelectorAll('.ui-hideable').forEach(el => el.classList.remove('ui-hidden'));
}

// In draw loop
if (uiVisible && performance.now() - lastMouseMove > UI_HIDE_DELAY) {
  uiVisible = false;
  document.querySelectorAll('.ui-hideable').forEach(el => el.classList.add('ui-hidden'));
}
```

```css
.ui-hideable {
  transition: opacity 0.6s ease;
}
.ui-hidden {
  opacity: 0;
  pointer-events: none;
}
```

**Note:** Mark ALL non-essential UI with class `ui-hideable`. Exclude: status text (if used for errors), fullscreen button (if present). Include: sliders, scale selectors, mode buttons, labels.

---

### 5. Stuck Note Prevention (Release-on-Vanish)

**What:** Every frame, check all active voices. If a voice's hand/finger is no longer tracked, immediately release it.

**Why:** MediaPipe can lose tracking (hand leaves frame, occlusion, fast movement). Without this, notes drone indefinitely.

**Acceptance:** Pull hand out of frame while holding a pinch → sound stops within one frame. Cover camera briefly → all notes release. No note ever plays longer than hand is visible.

**Implementation:**
```javascript
// After processing all detected hands, check for orphaned voices
const activeKeys = new Set(); // populated during hand processing

// ... (hand processing loop adds active pinched keys to activeKeys) ...

// Release any voice whose hand vanished
Object.keys(pinchState).forEach(k => {
  if (pinchState[k] && !activeKeys.has(k)) {
    pinchState[k] = false;
    if (voices[k]) voices[k].noteOff();
  }
});
```

---

### 6. Pause (master-bus mute + freeze)

**What:** A single `_setPaused(bool)` path that, on pause: (1) **silences at the master bus** with a click-free ramp — covering continuous/drone voices, not just discrete note-offs; (2) **freezes hand processing AND the live skeleton draw**; (3) shows a centered overlay. On resume it ramps the master bus back to the **intended** volume (the user's slider value, not a hardcoded constant). Spacebar toggles it; the same path is reused by auto-pause (#8) and any clap-to-pause.

**Why:** The v1.0 version only called `noteOff()` on discrete voices. Any variant with a **continuous/drone voice** (openvoice tone, pad, sustained osc) kept ringing through "pause" — a real bug found on theremin. Muting the master bus is voice-count- and engine-agnostic: one ramp silences everything. Freezing the skeleton draw makes "paused" read as genuinely stopped, not just quiet.

**Acceptance:** Pause mid-drone → **complete** silence within ~15ms, no click. Skeleton/hand overlay stops updating (frozen, not live). Resume → audio returns to the slider level (not full, not zero), no click. A continuous tone does NOT survive pause.

**Implementation:**
```javascript
let paused = false;

// Track the user's intended volume so resume restores it (not a constant).
// Set this wherever the volume slider writes: this._intendedVol = v;
// and guard the slider against un-muting while paused.

function setPaused(p) {
  paused = p;
  if (masterGain && audioCtx) {                         // (1) master-bus mute — click-free
    const t = audioCtx.currentTime, g = masterGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(p ? 0 : (intendedVol ?? MASTER_VOLUME), t + (p ? 0.015 : 0.04));
  }
  if (p) {                                               // clear discrete-voice state too
    Object.keys(pinchState).forEach(k => {
      if (pinchState[k]) { pinchState[k] = false; if (voices[k]) voices[k].noteOff(); }
    });
    // Clear any dwell/charge state (variant-specific)
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setPaused(!paused); }
});

// Detection/processing loop — early return when paused
function processFrame() {
  requestAnimationFrame(processFrame);
  // NOTE: if clap-to-pause is enabled, run the clap detector BEFORE this gate (see Provisional).
  if (paused) return;
  // ... normal processing ...
}

// Draw loop — (2) freeze the skeleton when paused; (3) overlay
if (!paused) drawSkeleton(ctx, W, H, hands);            // live hands frozen on pause
if (paused) {
  ctx.fillStyle = 'rgba(6,6,11,0.5)'; ctx.fillRect(0, 0, W, H);
  ctx.font = '24px Cinzel, serif'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,160,0,0.6)'; ctx.fillText('PAUSED', W / 2, H / 2);
  ctx.font = '10px DM Mono, monospace'; ctx.fillStyle = 'rgba(232,213,181,0.45)';
  ctx.fillText('press spacebar to resume', W / 2, H / 2 + 30);   // append "or clap" iff P1a/P1b enabled (single clap always suffices here)
  ctx.textAlign = 'start';
}
```

**Notes:**
- **The master-bus ramp is load-bearing; the `pinchState` clear is belt-and-suspenders.** For variants whose voices are **not** pinch-driven — autonomous ensembles, drones, sequencers/schedulers that play with hands down — the note-off loop silences *nothing*. Only the master-bus ramp stops them. Lead with the ramp; never assume note-off covers the audio.
- **`setPaused` is the single source of truth.** Pause logic tends to sprawl across sites — the spacebar keydown, auto-pause (#8), a scheduler gate inside `onFrame`. Every place that flips `paused` must call `setPaused()`; don't inline a second voice-kill anywhere.
- **Freeze:** if the variant already early-returns from `onFrame` when paused, the skeleton freeze is *already satisfied* — don't "fix" a full freeze into a partial one. Otherwise: particles/background may keep animating; only **hand processing, note triggering, and the live skeleton** must freeze.
- The master-bus ramp uses the click-free idiom of #14; never set `gain.value = 0` directly.

---

### 7. Help Overlay (full-viewport, badge + ? / key)

**What:** A **viewport-filling**, scrollable help overlay with a body-text **floor of 16pt**. Opened by typing `?` / `/` **or** clicking an always-present, **hover-lit `?` badge** on screen. Dismissed by an **X** close button, **Esc**, **backdrop click**, or **any key**.

**Why:** The v1.0 panel was a small centered box that capped at ~13px and had no on-screen entry point — undiscoverable on touch/large displays and unreadable when content grew. A full-screen, scrollable, min-16pt overlay with a visible badge is discoverable and legible everywhere. "Full screen" = a viewport-filling overlay, **not** the browser Fullscreen API.

**Acceptance:** Badge is visible and lights on hover; clicking it opens help. `?`/`/` toggles it. Overlay fills the viewport; long content scrolls; body text never renders below 16pt. X, Esc, backdrop, and any key all dismiss. Badge sits clear of the on-screen legend/guidance (no overlap).

**CSS** (palette-adapt the colors; structure is the standard):
```css
#help-overlay { display:none; position:absolute; inset:0; z-index:200; overflow-y:auto;
  align-items:flex-start; justify-content:center; padding:clamp(28px,7vh,80px) clamp(20px,6vw,80px);
  background:rgba(6,8,12,0.94); backdrop-filter:blur(8px); }
#help-overlay.visible { display:flex; }
#help-panel { max-width:min(92vw,680px); width:100%; margin:auto 0; line-height:1.75;
  font-size:clamp(16pt, 2.1vh, 21pt); }            /* 16pt floor, scales up on tall viewports */
#help-panel h2 { font-size:clamp(18pt,3vh,30pt); margin:0 0 0.6em; }
#help-close { position:absolute; top:clamp(16px,3vh,30px); right:clamp(16px,3vw,34px);
  width:46px; height:46px; border-radius:50%; z-index:201; cursor:pointer;
  display:flex; align-items:center; justify-content:center; }       /* the X */
#help-badge { position:absolute; bottom:clamp(184px,24vh,210px); right:clamp(16px,3vw,28px);
  z-index:80; width:42px; height:42px; border-radius:50%; cursor:pointer;   /* clear of the legend */
  display:flex; align-items:center; justify-content:center; transition:transform .2s, box-shadow .2s; }
#help-badge:hover { transform:scale(1.1); box-shadow:0 0 18px rgba(255,215,0,0.35); }
```

**Wiring:**
```javascript
const helpOverlay = document.getElementById('help-overlay');
let helpVisible = false;
const setHelp = v => { helpVisible = v; helpOverlay.classList.toggle('visible', v); };

document.getElementById('help-badge').addEventListener('click', () => setHelp(true));
document.getElementById('help-close').addEventListener('click', () => setHelp(false));
helpOverlay.addEventListener('click', e => { if (e.target === helpOverlay) setHelp(false); });  // backdrop

document.addEventListener('keydown', e => {
  if (e.key === '?' || e.key === '/') { setHelp(!helpVisible); return; }
  if (e.key === 'Escape' && helpVisible) { setHelp(false); return; }
  if (helpVisible && !e.metaKey && !e.ctrlKey && e.key !== 'Shift') setHelp(false);  // any-key dismiss
});
```

**HTML:** `#help-overlay` contains `#help-close` (the X) and `#help-panel` (an `<h2>` title + variant-specific `<em>`-tagged control lines). A separate `#help-badge` button lives in the chrome layer.

**Note:** Content must be variant-specific. Each variant fills `#help-panel` with its own controls (scales, modes, gestures). **Badge position is per-variant** — place it clear of *that variant's* densest chrome corner. The conflicting element differs: on theremin it's the bottom-right legend; on stellar-conductor it's the bottom-right `#vol-wrap` (so the badge sits raised above it). Don't copy a fixed `bottom` value between variants.

---

### 8. Auto-Pause on Inactivity

**What:** If no hands are detected for 30 consecutive seconds, automatically trigger pause state (same as spacebar pause).

**Why:** Prevents droning/speaker damage if user walks away. Also saves CPU/GPU by stopping MediaPipe inference after pause.

**Acceptance:** Remove hands from frame → 30 seconds later → app pauses automatically. Moving hands back into frame does NOT auto-resume (user must press spacebar). Hands being present but idle (visible, no pinches) does NOT trigger auto-pause.

**Implementation:**
```javascript
let lastHandsSeen = performance.now();
const AUTO_PAUSE_DELAY = 30000; // 30 seconds

// In processFrame, after hand detection
if (handResults && handResults.length > 0) {
  lastHandsSeen = performance.now();
} else if (!paused && performance.now() - lastHandsSeen > AUTO_PAUSE_DELAY) {
  setPaused(true);   // reuse the #6 master-bus mute path — never inline a bespoke voice-kill
}
```

**Note:** Auto-pause MUST route through the same `setPaused()` as spacebar (#6) so continuous/drone voices are silenced at the master bus, not just discrete note-offs.

---

### 9. Pinch Hysteresis

**What:** Separate thresholds for note-on (tighter) and note-off (looser). Prevents rapid flickering when finger distance hovers near a single threshold.

**Why:** Without hysteresis, a finger hovering at the edge of threshold causes machine-gun note triggering (on-off-on-off every frame).

**Acceptance:** Slowly bring finger toward thumb — note triggers cleanly once. Hold finger at boundary — no flickering. Pull away slightly — note holds. Pull further — clean single release.

**Parameters:**
```javascript
const PINCH_ON  = 0.062;  // must get THIS close to trigger
const PINCH_OFF = 0.092;  // must get THIS far to release

const wasOn = pinchState[key];
const thresh = wasOn ? PINCH_OFF : PINCH_ON;

if (dist < thresh && !wasOn) {
  pinchState[key] = true;
  voice.noteOn(freq, vol);
} else if (dist >= thresh && wasOn) {
  pinchState[key] = false;
  voice.noteOff();
}
```

---

### 10. Velocity Sensitivity

**What:** Measure pinch speed at note-on (how fast the finger approached the thumb) and map to attack intensity.

**Why:** Playing feels mechanical without velocity. Fast pinches should hit harder; gentle pinches should be soft.

**Acceptance:** Quick snap of finger to thumb → louder/brighter attack. Slow gentle pinch → soft entry. Perceptible difference.

**Implementation:**
```javascript
// Keep 3-frame ring buffer of pinch distances per voice
const distHistory = {};  // { key: [d0, d1, d2] }

// Update each frame
distHistory[key][0] = distHistory[key][1];
distHistory[key][1] = distHistory[key][2];
distHistory[key][2] = currentDist;

// On note-on, compute velocity
const vel = Math.max(0, Math.min(1,
  (distHistory[key][0] - currentDist) / PINCH_ON
));
voice.noteOn(freq, vol, vel);  // variant decides how vel maps to sound
```

---

### 11. AudioContext Resume Guard

**What:** On every frame, check if AudioContext is suspended and resume it.

**Why:** Browsers block AudioContext until user gesture. Even after click-to-start, some browsers re-suspend on tab switch. This catch-all prevents silent sessions.

**Acceptance:** App never enters a state where hands are tracked and pinching but no sound plays due to suspended AudioContext.

**Implementation:**
```javascript
// In processFrame, near the top
if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
```

---

### 12. Responsive Canvas Resize

**What:** Listen for window resize events and update canvas dimensions + any layout-dependent calculations.

**Why:** Users fullscreen the app, use split-screen, or rotate mobile devices. Layout must adapt.

**Acceptance:** Toggle fullscreen → canvas fills viewport, no stretching. Split-screen → canvas adapts. No stale coordinate calculations after resize.

**Implementation:**
```javascript
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Recalculate any position-dependent state
  // (e.g., orb positions, scale zones, etc.)
}
resize();
window.addEventListener('resize', resize);
```

---

### 13. Toast Notification System

**What:** Lightweight, auto-dismissing text messages for mode changes, voice assignments, and user feedback.

**Why:** Variants have modes, scales, and voice switches that need confirmation without modal dialogs or permanent UI.

**Acceptance:** Switching a mode shows a toast for ~2 seconds, then fades. Multiple toasts stack. Never blocks interaction.

**Implementation:**
```javascript
const toasts = [];

function showToast(text, color = '#ffd700') {
  toasts.push({ text, color, startTime: performance.now(), duration: 2000 });
}

function tickToasts(W, H) {
  const now = performance.now();
  for (let i = toasts.length - 1; i >= 0; i--) {
    const t = toasts[i];
    const elapsed = now - t.startTime;
    if (elapsed > t.duration) { toasts.splice(i, 1); continue; }
    const alpha = elapsed < 200 ? elapsed / 200 :
                  elapsed > t.duration - 400 ? (t.duration - elapsed) / 400 : 1;
    const y = H * 0.85 - i * 30;
    ctx.font = '12px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = t.color + Math.floor(alpha * 200).toString(16).padStart(2, '0');
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 12 * alpha;
    ctx.fillText(t.text, W / 2, y);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'start';
  }
}
```

---

### 14. Click-Free Audio Ramps

**What:** Never assign an audio param abruptly. Step changes (pause, mode switch, voice gate) use the cancel→hold→ramp idiom; continuous changes use `setTargetAtTime`.

**Why:** A bare `gain.value = 0` (or any discontinuity) produces an audible click/pop. Every gate, mute, and switch must glide.

**Acceptance:** Pausing, switching modes, gating a voice on/off, and large filter sweeps produce no clicks or pops.

**Implementation:**
```javascript
// Step change (mute, gate, switch) — schedule from the current value, then ramp:
function rampTo(param, value, t, secs = 0.02) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);          // anchor at where we actually are
  param.linearRampToValueAtTime(value, t + secs);
}

// Continuous per-frame tracking (pitch, volume, filter) — time-constant smoothing:
param.setTargetAtTime(target, audioCtx.currentTime, 0.05);
```

**Note:** The master-bus mute in #6 IS this idiom. Pair with #1 (motion smoothing) — #1 smooths the *control signal*, #14 smooths the *audio param*; both are needed. **In practice this is mostly an audit, not new code** — most variants already ramp their per-voice params; the common gap is the pause path (#6). Spot-check for bare `gain.value =` / `frequency.value =` in mid-performance code paths.

---

### 15. UI Contrast Floor (Readable Chrome)

**What:** On-screen chrome (labels, legends, titles, pills, status) holds a minimum opacity so it's legible over the live camera + canvas. The per-frame background veil stays light enough that chrome reads through it.

**Why:** A catalog-wide regression: control opacities sat at 0.08–0.35 and were *compounded* by a heavy per-frame canvas veil (~0.28), leaving text and buttons looking disabled ("behind a dimming layer"). Two dimmers stack multiplicatively.

**Acceptance:** Every label, legend line, title, pill, and status string is comfortably readable over a bright camera feed. Nothing essential looks greyed-out/disabled. The pitch-trace/particle trail still reads (veil not too light).

**Parameters (floors, adapt to palette):**
```text
labels / legend / status / pills    opacity ≥ 0.5   (active/primary ≥ 0.7)
titles / headings                    opacity ≥ 0.6
secondary / sub-labels               opacity ≥ 0.4
per-frame background veil            alpha   ≤ ~0.18  (was 0.28 — too heavy)
```

**Note:** The two dimmers compound — fixing only the label opacity OR only the veil is not enough. **But audit, don't blind-edit:** raise only what's actually below floor. The veil is often already fine (stellar-conductor's was 0.17 — at floor; only its label opacities needed raising), and lowering an already-good value would over-correct. Check both; change each only if it's under. Disabled/inactive states may go below the floor *intentionally*; live controls may not.

**The veil ceiling only compounds with *canvas-drawn* chrome.** Where chrome is **DOM layered above the canvas** (positioned elements at a higher z-index than `#canvas`), the per-frame veil dims the camera feed *behind* the text — it does **not** stack with the DOM opacity, and a darker canvas background actually *improves* DOM text contrast. In that layout the ≤0.18 ceiling does not apply: a heavier veil that's part of the visual identity (e.g. pulling-cliff's 0.30 oscilloscope persistence trail) is fine — fix only the DOM chrome opacities. Apply the ≤0.18 ceiling **only** to chrome the variant paints onto the canvas itself (text/HUD drawn via `ctx.fillText`), where the two dimmers genuinely multiply.

---

### 16. Swap-and-Pop in Hot Loops

**What:** Remove dead items from per-frame particle/effect arrays with swap-and-pop, never `splice`.

**Why:** `arr.splice(i, 1)` in a draw/tick loop is O(n) and churns memory; at particle scale it causes periodic micro-stutter and GC stalls. Swapping the dead item with the last element and `pop()` is O(1) and allocation-free. Pure perf, zero behavior change.

**Acceptance:** Identical visuals; frame rate holds steady under heavy particle load (no periodic stutter).

**Implementation:**
```javascript
for (let i = arr.length - 1; i >= 0; i--) {        // descending — required
  const p = arr[i];
  // ...update p...
  if (p.life <= 0) { arr[i] = arr[arr.length - 1]; arr.pop(); continue; }
  // ...draw p...
}
```

**Note:** Safe only where draw order is irrelevant (true for all known effect arrays). **Do NOT** apply to order-bound arrays: `toasts` (#13 — index = stack position) and any timing-ordered queue (e.g. pulse's `vizQueue`) keep their `splice`. Ledger: `concerns/swap-and-pop-particles.md` (applied across 12 variants, 2026-06-04).

---

## Provisional — documented, NOT yet mandatory

### P1. Clap Gestures (occlusion-as-contact, two tiers)

**Status:** Prototyped on theremin; **not in the mandatory checklist** until one clean camera pass per variant. Spacebar (#6) remains the universal pause/unpause; clap is additive.

---

#### P1a. Single clap while paused → unpause (recommend universally once verified)

**What:** A single clap while the app is paused resumes it. Because the app is already silent and frozen, the false-positive cost is negligible — the worst case is an accidental resume, which the user can immediately re-pause. **Enable P1a for every variant that passes camera verification, even if P1b is impractical.**

**Pause overlay text:** append "or clap" after "press spacebar to resume" whenever P1a is active.

---

#### P1b. Double clap → toggle pause (variant-conditional)

**What:** Two hands clapped together toggle pause from either state (pause OR unpause). More powerful than P1a but carries meaningful false-positive risk mid-performance — a fast effect-hand gesture toward the player hand can mimic the convergence signature. **Only enable P1b when the variant's gesture vocabulary and layout make a false-pause acceptable.** Variants with heavy two-hand effect gestures should keep P1a (clap-to-unpause) and omit P1b.

---

**Detection model (shared by P1a and P1b):** Palms meeting **occlude each other** (MediaPipe drops a hand), so a *sustained fast convergence that collapses to <2 hands* IS the contact — don't try to see both palms at impact.

**Hard-won caveats:**
- **Occlusion eats the impact** — treat the collapse-to-<2-hands as the hit, not a distance reading.
- **Window must be generous** (~1200ms between claps, P1b): watched clap-clap is 700–1000ms apart plus re-acquisition latency. Too tight = second impact re-enters the first-clap branch, never toggles.
- **Re-arm via separation** (hysteresis on a release distance) so the second clap of a pair registers.
- **Guard P1b:** sustained-convergence frame count + any-pinch veto to suppress false triggers.
- **Debug HUD required** — toggle `c` to expose `hands / d / vel / latch / clap1 / window-remaining / lost-frames` so a failed attempt is diagnosable, not a blind re-tune.

**Tripwire:** single-clap (P1a) demonstrably works; clap-clap (P1b) has been the failure mode. If P1b fails the HUD test, keep P1a and defer P1b — do not tune endlessly. Full notes: `POLISH-PROTOCOL-PENDING.md`.

---

## Gesture Vocabulary (reference)

Reusable gesture primitives proven on theremin now live in **`handysynth-foundation/CLAUDE.md` → Gesture Vocabulary** (the canonical home). Brief reiteration so variant authors know they exist:

- **`handTwist(lms)`** — in-plane hand rotation, `atan2(midMCP − wrist)`. ⚠ This is *steering-wheel* rotation in the image plane — **forearm pronation is NOT recoverable from 2D landmarks**. Calibrate a baseline; don't expect absolute angle accuracy.
- **`handOpenness(lms)`** — 0 (fist) … 1 (open), normalized by palm size.
- **`estimateDepth(lms)`** — 0 (near) … 1 (far), already in core.
- **Effect-hand axis set** — a five-way vocabulary for mapping one hand to continuous controls: **Y-Lift · X-Slide · Z-Pull (depth) · T-Twist · G-Grip (openness)**.

Use these instead of re-deriving per variant. Smooth twist with shortest-arc EMA (unwrap the angle delta).

---

## Retrofit Checklist (Existing Variant Version Bump)

When upgrading an existing variant, apply each item below. Check off as implemented and tested.

```
[ ] 1.  Motion smoothing — EMA on X, Y, Z before mapping to audio
[ ] 2.  Canvas clear — semi-transparent fill, no hand ghosting
[ ] 3.  Cursor particles — cursor:none + themed trailing emitter (verify no bespoke reticle)
[ ] 4.  Immersive mode — .ui-hideable class + 3s mouse-idle auto-hide
[ ] 5.  Release-on-vanish — orphaned voices killed every frame
[ ] 6.  Pause — master-bus mute (covers drones) + skeleton freeze + intended-vol resume
[ ] 7.  Help overlay — full-viewport, 16pt floor, ? badge, X/Esc/backdrop/any-key dismiss
[ ] 8.  Auto-pause — 30s no hands → setPaused(true) (shared mute path, no auto-resume)
[ ] 9.  Pinch hysteresis — separate on/off thresholds
[ ] 10. Velocity sensitivity — 3-frame distance delta → attack intensity
[ ] 11. AudioContext guard — resume-on-suspended every frame
[ ] 12. Responsive resize — canvas + layout recalc on window resize
[ ] 13. Toast system — auto-dismiss notifications for mode changes
[ ] 14. Click-free ramps — cancel→hold→ramp for steps; setTargetAtTime for continuous
[ ] 15. UI contrast floor — chrome ≥ 0.5 opacity; per-frame veil ≤ ~0.18 (both, they compound)
[ ] 16. Swap-and-pop — hot-loop array removal (skip toasts / order-bound queues)
[ ] P1a. (provisional) Single clap while paused → unpause — universal once camera-verified; recommend for all variants
[ ] P1b. (provisional) Double clap → toggle pause — variant-conditional; skip if heavy two-hand gestures create false-pause risk
```

### Version Bump Convention

When all 16 mandatory items are confirmed present, bump the variant's minor version (e.g., 1.0 → 1.1) and note "universal polish v1.1" in the changelog. P1 (clap) is not required for the bump.

---

## Notes for Variant Generators

When Claude (or any system) generates a new variant, ALL 16 mandatory items above are **mandatory inclusions** — they are not optional enhancements. The variant's unique identity comes from its audio engine, visual theme, and gesture interpretation. The polish items are infrastructure that every instrument needs. (P1a clap-to-unpause: recommend universally once camera-verified. P1b clap-to-pause: variant-conditional — omit if the gesture vocabulary creates false-pause risk.)

Adapt colors, fonts, and particle physics to the variant's palette and theme, but do not omit any mandatory item.
