# Universal Variant Polish Standard

**Version:** 1.0
**Date:** 2026-05-29
**Status:** Active
**Scope:** Mandatory UX features for all HandySynth/Pyrefey variant builds

---

## Purpose

Every variant shipped through the catalog must include these interaction refinements. They ensure a consistent, professional feel regardless of the audio engine or visual theme. When generating a new variant or upgrading an existing one, apply all items below.

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
    if (p.life <= 0) { CURSOR_PARTICLES.splice(i, 1); continue; }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,160,80,${(p.life * 0.3).toFixed(3)})`;
    ctx.fill();
  }
}
```

**Variant adaptation:** Change particle color, drift direction, and size to match the variant palette. Bird variants might use feather-drift physics; water variants might use droplet gravity.

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

### 6. Spacebar Pause

**What:** Pressing spacebar immediately silences all active voices, freezes hand processing, and shows a centered pause overlay. Second press resumes.

**Why:** Players need an instant mute — doorbell rings, phone call, need to adjust something without sound.

**Acceptance:** Tap spacebar mid-note → complete silence within one frame. Overlay appears. Tap again → processing resumes, overlay disappears. No audio artifacts (pops, clicks) on pause/resume.

**Implementation:**
```javascript
let paused = false;

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    paused = !paused;
    if (paused) {
      // Kill all active voices
      Object.keys(pinchState).forEach(k => {
        if (pinchState[k]) {
          pinchState[k] = false;
          if (voices[k]) voices[k].noteOff();
        }
      });
      // Clear any dwell/charge state (variant-specific)
      // e.g., Object.keys(dwellState).forEach(k => delete dwellState[k]);
    }
  }
});

// In frame processing loop — early return
function processFrame() {
  requestAnimationFrame(processFrame);
  if (paused) return;
  // ... normal processing ...
}

// In draw loop — render pause overlay
if (paused) {
  ctx.fillStyle = 'rgba(6,6,11,0.5)';
  ctx.fillRect(0, 0, W, H);
  ctx.font = '24px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,160,0,0.6)';
  ctx.fillText('PAUSED', W / 2, H / 2);
  ctx.font = '10px DM Mono, monospace';
  ctx.fillStyle = 'rgba(232,213,181,0.3)';
  ctx.fillText('press spacebar to resume', W / 2, H / 2 + 30);
  ctx.textAlign = 'start';
}
```

**Note:** The draw loop should NOT freeze — particles should keep fading, background can dim. Only hand processing and note triggering pause.

---

### 7. Help Overlay (? or / Key)

**What:** Pressing `?` or `/` toggles a centered, semi-transparent help panel showing controls and instructions. Any other keypress dismisses it.

**Why:** New users need to discover controls without leaving the app. Experienced users never see it.

**Acceptance:** Press ? → help appears centered, readable, semi-transparent. Press any key → help dismisses. Help content covers: play gesture, pause, help toggle, any variant-specific controls.

**Implementation:**
```javascript
let helpVisible = false;

document.addEventListener('keydown', (e) => {
  if (e.key === '?' || e.key === '/') {
    helpVisible = !helpVisible;
    document.getElementById('help-overlay').style.display = helpVisible ? 'flex' : 'none';
    return;
  }
  if (helpVisible && !e.metaKey && !e.ctrlKey && e.key !== 'Shift') {
    helpVisible = false;
    document.getElementById('help-overlay').style.display = 'none';
    return;
  }
});
```

**HTML structure:**
```html
<div id="help-overlay" style="display:none; position:absolute; inset:0; z-index:90;
  display:flex; align-items:center; justify-content:center;
  background:rgba(6,6,11,0.85); backdrop-filter:blur(4px);">
  <div style="max-width:420px; text-align:center; color:#e8d5b5; font-family:'DM Mono',monospace; font-size:13px; line-height:1.8;">
    <strong style="font-family:Cinzel,serif; font-size:18px; color:#ffd700;">Controls</strong><br><br>
    <em>Pinch thumb to finger</em> — play a note<br>
    <em>Space</em> — pause / resume<br>
    <em>? or /</em> — toggle this help<br>
    <!-- Variant-specific controls go here -->
  </div>
</div>
```

**Note:** Content must be variant-specific. Each variant adds its own control descriptions (scale switching, mode changes, etc.).

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
} else {
  if (!paused && performance.now() - lastHandsSeen > AUTO_PAUSE_DELAY) {
    paused = true;
    // Kill voices (same as spacebar pause)
    Object.keys(pinchState).forEach(k => {
      if (pinchState[k]) {
        pinchState[k] = false;
        if (voices[k]) voices[k].noteOff();
      }
    });
  }
}
```

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

## Retrofit Checklist (Existing Variant Version Bump)

When upgrading an existing variant, apply each item below. Check off as implemented and tested.

```
[ ] 1.  Motion smoothing — EMA on X, Y, Z before mapping to audio
[ ] 2.  Canvas clear — semi-transparent fill, no hand ghosting
[ ] 3.  Cursor particles — cursor:none + themed trailing emitter
[ ] 4.  Immersive mode — .ui-hideable class + 3s mouse-idle auto-hide
[ ] 5.  Release-on-vanish — orphaned voices killed every frame
[ ] 6.  Spacebar pause — immediate silence, overlay, full voice kill
[ ] 7.  Help overlay — ?// toggle, any-key dismiss, variant-specific content
[ ] 8.  Auto-pause — 30s no hands → auto-pause (no auto-resume)
[ ] 9.  Pinch hysteresis — separate on/off thresholds
[ ] 10. Velocity sensitivity — 3-frame distance delta → attack intensity
[ ] 11. AudioContext guard — resume-on-suspended every frame
[ ] 12. Responsive resize — canvas + layout recalc on window resize
[ ] 13. Toast system — auto-dismiss notifications for mode changes
```

### Version Bump Convention

When all 13 items are confirmed present, bump the variant's minor version (e.g., 1.0 → 1.1) and note "universal polish v1.0" in the changelog.

---

## Notes for Variant Generators

When Claude (or any system) generates a new variant, ALL 13 items above are **mandatory inclusions** — they are not optional enhancements. The variant's unique identity comes from its audio engine, visual theme, and gesture interpretation. The polish items are infrastructure that every instrument needs.

Adapt colors, fonts, and particle physics to the variant's palette and theme, but do not omit any item.
