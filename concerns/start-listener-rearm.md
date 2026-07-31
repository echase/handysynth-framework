---
id: start-listener-rearm
intent: A failed start must be retryable — no `{ once: true }` start listeners without re-arm, no unhandled throw inside `start()`
why: Pantastic's 2026-07-25 review (C1) found the drumspace-chassis startup pattern leaves a permanently dead page on any start failure. The overlay's three entry listeners were registered `{ once: true }` and never re-armed, so the "Audio blocked — tap again" branch restored a visible overlay whose instruction was impossible to follow — the listeners were already spent. Worse, any throw inside `start()` (a WebGL-less machine hitting an unguarded `gl.getExtension`, a rejected AudioContext) became an unhandled rejection with the started-flag stuck true and the overlay hidden at `opacity: 0; pointer-events: none` — a transparent, click-through veil over a dead instrument. Reload was the only exit. The pattern is inherited chassis code, so every variant descended from the same startup shape is suspect.
acceptance: Simulate both failure classes — (1) AudioContext resume rejection, (2) a throw mid-start (e.g. WebGL unavailable) — and confirm the start overlay returns, its status line names the failure, and a second tap/click/keypress genuinely retries. A variant whose fluid/visual layer fails must degrade to a playable instrument (audio + input alive), not a dead page.
detection: `grep -n "once: *true" <variant>/index.html` near the start-overlay listeners; then read `start()` for (a) a try/catch around its body that restores the overlay and resets the started-flag, and (b) listener re-arm (or persistent listeners guarded by an idempotent started-flag). Missing either = needs-patch. Also flag any `getWebGLContext`-style helper that calls `gl.getExtension` without a null guard.
applicability: Every variant — all share the click-to-start AudioContext gesture gate. The WebGL half applies only to variants mounting a GL layer (lumini consumers).
status:
  pantastic: applied@v0.9b
---

## Canonical pattern (from pantastic v0.9b)

Persistent listeners + idempotent guard, not `{ once: true }`:

```javascript
let _dsStarted = false;
async function start() {
  if (_dsStarted) return;
  _dsStarted = true;
  overlay.classList.add('hidden');
  try {
    // ...audio unlock, camera, engine mounts...
  } catch (err) {
    _dsStarted = false;                       // re-arm the guard, listeners persist
    overlay.classList.remove('hidden');
    status.textContent = `Start failed — ${err.name}: ${err.message}. Tap to retry.`;
    return;
  }
}
overlay.addEventListener('click', start);      // NO { once: true }
```

Load-bearing details:

1. **The guard is the idempotence, not the listener option.** `{ once: true }` conflates
   "don't double-start" with "never retry." A boolean reset in every failure branch keeps
   the listeners live and the retry instruction honest.
2. **Optional layers fail soft.** Wrap each non-essential mount (fluid, decorative GL) in
   its own try/catch; on failure null the handle, note it in the status line, and continue.
   Null-guard every later use of the handle. The instrument must play without its
   decoration.
3. **Guard `gl.getExtension`.** `canvas.getContext('webgl2'/'webgl')` returns null on
   WebGL-less machines; calling `getExtension` on it throws inside the mount and, without
   detail 2, kills the whole start.
4. **iOS constraint still holds** (foundation CLAUDE.md): the audio resume must stay inside
   the direct user-gesture callback. The try/catch wraps it in place — never move the
   resume to satisfy the error handling.

## Sweep

Catalog-wide sweep pending — the pattern is chassis-inherited, so drumspace descendants
(and any variant copied from one) are the priority suspects. Classify each variant on its
next touch, or in a dedicated sweep session.
