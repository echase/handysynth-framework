/**
 * PYREFEY — Fire Wizardry / Fey Magik
 * HandySynth variant: audio engine + visual theme
 *
 * Finger → Voice mapping:
 *   0 (index)  → Sigil   (dual-saw lead)
 *   1 (middle) → Ember   (sine+tri pad)
 *   2 (ring)   → Crystal (shimmer bells, auto-decay)
 *   3 (pinky)  → Howl    (FM synthesis)
 */

import {
  FINGER_TIPS, THUMB_TIP, FINGER_NAMES,
  HAND_CONNECTIONS, freqToNote, estimateDepth, pinchDistance
} from '../../handysynth.js';

// ═══════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════

const FINGER_MODES  = ['sigil', 'ember', 'crystal', 'howl'];
const FINGER_LABELS = ['Sigil', 'Ember', 'Crystal', 'Howl'];

const FINGER_COLORS = {
  Right: ['#ffaa2a', '#ff5533', '#bb66ff', '#44ee88'],
  Left:  ['#ffc855', '#ff7744', '#cc88ff', '#66ffaa'],
};

const RUNES = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ'];
function freqToRune(f) {
  const m = Math.round(12 * Math.log2(f / 440) + 69);
  return RUNES[((m % 12) + 12) % 12];
}

// ═══════════════════════════════════════════════════════════════
//  Z-AXIS PARAMETER CURVES
// ═══════════════════════════════════════════════════════════════

function depthToFilter(d)  { return 80 + Math.pow(d, 1.5) * 15920; }
function depthToQ(d)       { return 1 + Math.pow(d, 2) * 18; }
function depthToReverb(d)  { return 0.02 + Math.pow(d, 1.3) * 0.75; }

// ═══════════════════════════════════════════════════════════════
//  VOICE CLASS (variant-specific audio)
// ═══════════════════════════════════════════════════════════════

class Voice {
  constructor(audioCtx, masterGain, convolver, fingerIdx) {
    this.audioCtx = audioCtx;
    this.mode = FINGER_MODES[fingerIdx];
    this.active = false;

    this.osc1 = audioCtx.createOscillator();
    this.osc2 = audioCtx.createOscillator();

    this.modOsc  = audioCtx.createOscillator();
    this.modGain = audioCtx.createGain();
    this.modOsc.connect(this.modGain);
    this.modGain.connect(this.osc1.frequency);
    this.modGain.gain.value = 0;
    this.modOsc.start();

    this.filter = audioCtx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 400;
    this.filter.Q.value = 2;

    this.reverbSend = audioCtx.createGain();
    this.reverbSend.gain.value = 0;

    this.vGain = audioCtx.createGain();
    this.vGain.gain.value = 0;

    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);
    this.filter.connect(this.vGain);
    this.vGain.connect(masterGain);
    this.filter.connect(this.reverbSend);
    this.reverbSend.connect(convolver);

    this.osc1.start();
    this.osc2.start();

    // Configure oscillators per mode
    switch (this.mode) {
      case 'sigil':
        this.osc1.type = 'sawtooth'; this.osc2.type = 'sawtooth';
        this.osc2.detune.value = -8; break;
      case 'ember':
        this.osc1.type = 'sine'; this.osc2.type = 'triangle';
        this.osc2.detune.value = 7; break;
      case 'crystal':
        this.osc1.type = 'sine'; this.osc2.type = 'sine';
        this.osc2.detune.value = 1200; break;
      case 'howl':
        this.osc1.type = 'sine'; this.osc2.type = 'sine';
        this.osc2.detune.value = 702; break;
    }
  }

  noteOn(freq, vol, depth) {
    const t   = this.audioCtx.currentTime;
    const fHz = depthToFilter(depth);
    const fQ  = depthToQ(depth);
    const rev = depthToReverb(depth);

    this.osc1.frequency.setTargetAtTime(freq, t, 0.008);
    this.osc2.frequency.setTargetAtTime(freq, t, 0.008);

    if (this.mode === 'howl') {
      this.modOsc.frequency.setTargetAtTime(freq * 2.37, t, 0.008);
      this.modGain.gain.setTargetAtTime(freq * 2.0, t, 0.01);
    }

    this.filter.frequency.setTargetAtTime(fHz, t, 0.02);
    this.filter.Q.setTargetAtTime(fQ, t, 0.02);
    this.reverbSend.gain.setTargetAtTime(rev, t, 0.03);

    const atk = this.mode === 'crystal' ? 0.005
              : this.mode === 'howl'    ? 0.012
              : this.mode === 'sigil'   ? 0.018
              : 0.07;

    this.vGain.gain.cancelScheduledValues(t);
    this.vGain.gain.setValueAtTime(this.vGain.gain.value, t);
    this.vGain.gain.linearRampToValueAtTime(vol * 0.35, t + atk);

    if (this.mode === 'crystal') {
      this.vGain.gain.setTargetAtTime(0, t + atk + 0.01, 0.4);
    }

    this.active = true;
  }

  update(freq, vol, depth) {
    if (!this.active) return;
    const t   = this.audioCtx.currentTime;
    const fHz = depthToFilter(depth);
    const fQ  = depthToQ(depth);
    const rev = depthToReverb(depth);

    this.osc1.frequency.setTargetAtTime(freq, t, 0.03);
    this.osc2.frequency.setTargetAtTime(freq, t, 0.03);

    if (this.mode === 'howl') {
      this.modOsc.frequency.setTargetAtTime(freq * 2.37, t, 0.03);
      this.modGain.gain.setTargetAtTime(freq * (1.2 + rev * 2.5), t, 0.04);
    }

    this.filter.frequency.setTargetAtTime(fHz, t, 0.04);
    this.filter.Q.setTargetAtTime(fQ, t, 0.04);
    this.reverbSend.gain.setTargetAtTime(rev, t, 0.04);

    if (this.mode !== 'crystal') {
      this.vGain.gain.setTargetAtTime(vol * 0.35, t, 0.03);
    }
  }

  noteOff() {
    if (!this.active) return;
    const t = this.audioCtx.currentTime;
    const rel = this.mode === 'ember' ? 0.12 : this.mode === 'howl' ? 0.08 : 0.05;
    this.vGain.gain.setTargetAtTime(0, t, rel);
    this.reverbSend.gain.setTargetAtTime(0, t, 0.15);
    this.active = false;
  }
}

// ═══════════════════════════════════════════════════════════════
//  PARTICLE SYSTEMS
// ═══════════════════════════════════════════════════════════════

const BG_EMBERS = [], FIRE = [], BURSTS = [], RUNE_GLYPHS = [], SMOKE = [], RIPPLES = [];
const MAX_BG = 80, MAX_FIRE = 140, MAX_BURST = 60, MAX_RUNE = 20, MAX_SMOKE = 40;

function tickBgEmbers(ctx, W, H) {
  while (BG_EMBERS.length < MAX_BG) {
    BG_EMBERS.push({ x: Math.random()*W, y: H+Math.random()*20,
      vx: (Math.random()-0.5)*0.3, vy: -Math.random()*0.8-0.15,
      size: Math.random()*2.5+0.5, life: 1, decay: 0.002+Math.random()*0.003,
      hue: 15+Math.random()*30, flicker: Math.random()*Math.PI*2 });
  }
  for (let i = BG_EMBERS.length-1; i >= 0; i--) {
    const e = BG_EMBERS[i];
    e.x += e.vx + Math.sin(e.flicker += 0.02)*0.15; e.y += e.vy; e.life -= e.decay;
    if (e.life <= 0 || e.y < -10) { BG_EMBERS.splice(i, 1); continue; }
    ctx.beginPath(); ctx.arc(e.x, e.y, e.size*e.life, 0, Math.PI*2);
    ctx.fillStyle = `hsla(${e.hue},90%,55%,${e.life*(0.2+Math.sin(e.flicker)*0.1)})`;
    ctx.fill();
  }
}

function spawnFire(x, y, depth) {
  if (FIRE.length >= MAX_FIRE) return;
  const count = 2 + Math.floor(depth * 6);
  for (let n = 0; n < count; n++) {
    FIRE.push({ x: x+(Math.random()-0.5)*8, y: y+(Math.random()-0.5)*4,
      vx: (Math.random()-0.5)*(1.5+depth*2), vy: -Math.random()*(3+depth*4)-1.5,
      size: Math.random()*(3+depth*5)+2, life: 1, decay: 0.022+Math.random()*0.02 });
  }
}

function tickFire(ctx) {
  for (let i = FIRE.length-1; i >= 0; i--) {
    const p = FIRE[i];
    p.x += p.vx + Math.sin(p.life*8)*0.8; p.y += p.vy; p.vy *= 0.97; p.vx *= 0.96; p.life -= p.decay;
    if (p.life <= 0) { FIRE.splice(i, 1); continue; }
    const phase = 1 - p.life;
    let hue, sat, lum, alpha;
    if (phase < 0.3) { hue=50; sat=100; lum=70; alpha=p.life*0.9; }
    else if (phase < 0.6) { hue=25; sat=95; lum=55; alpha=p.life*0.8; }
    else { hue=8; sat=70; lum=30; alpha=p.life*0.5; }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size*(0.3+p.life*0.7), 0, Math.PI*2);
    ctx.fillStyle = `hsla(${hue},${sat}%,${lum}%,${alpha})`; ctx.fill();
  }
}

function spawnBurst(x, y, color) {
  for (let n = 0; n < 16; n++) {
    if (BURSTS.length >= MAX_BURST) break;
    const a = (n/16)*Math.PI*2 + Math.random()*0.3, sp = 2+Math.random()*5;
    BURSTS.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      size: Math.random()*3+1, life: 1, decay: 0.03+Math.random()*0.02, color });
  }
}

function tickBursts(ctx) {
  for (let i = BURSTS.length-1; i >= 0; i--) {
    const p = BURSTS[i];
    p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy *= 0.94; p.life -= p.decay;
    if (p.life <= 0) { BURSTS.splice(i, 1); continue; }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
    ctx.fillStyle = p.color + Math.floor(p.life*220).toString(16).padStart(2,'0'); ctx.fill();
  }
}

function spawnRune(x, y, rune, note) {
  if (RUNE_GLYPHS.length >= MAX_RUNE) RUNE_GLYPHS.shift();
  RUNE_GLYPHS.push({ x, y, rune, note, vy: -0.6, life: 1, decay: 0.008,
    rot: (Math.random()-0.5)*0.4, size: 28+Math.random()*8 });
}

function tickRunes(ctx) {
  for (let i = RUNE_GLYPHS.length-1; i >= 0; i--) {
    const r = RUNE_GLYPHS[i]; r.y += r.vy; r.vy *= 0.995; r.life -= r.decay;
    if (r.life <= 0) { RUNE_GLYPHS.splice(i, 1); continue; }
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
    ctx.globalAlpha = r.life * 0.85;
    ctx.font = `${Math.floor(r.size)}px Cinzel,serif`; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 18;
    ctx.fillText(r.rune, 0, 0); ctx.shadowBlur = 0;
    ctx.font = '9px DM Mono,monospace'; ctx.fillStyle = `rgba(232,213,181,${r.life*0.4})`;
    ctx.fillText(r.note, 0, 16);
    ctx.restore(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
}

function spawnSmoke(x, y) {
  for (let n = 0; n < 5; n++) {
    if (SMOKE.length >= MAX_SMOKE) break;
    SMOKE.push({ x: x+(Math.random()-0.5)*10, y, vx: (Math.random()-0.5)*1.5,
      vy: -Math.random()*1.5-0.3, size: Math.random()*8+4, life: 1, decay: 0.018+Math.random()*0.01 });
  }
}

function tickSmoke(ctx) {
  for (let i = SMOKE.length-1; i >= 0; i--) {
    const s = SMOKE[i];
    s.x += s.vx; s.y += s.vy; s.vx *= 0.98; s.vy *= 0.99; s.size += 0.3; s.life -= s.decay;
    if (s.life <= 0) { SMOKE.splice(i, 1); continue; }
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2);
    ctx.fillStyle = `rgba(80,60,50,${s.life*0.12})`; ctx.fill();
  }
}

function spawnRipple(x, y, color) { RIPPLES.push({ x, y, r: 5, color, life: 1 }); }

function tickRipples(ctx) {
  for (let i = RIPPLES.length-1; i >= 0; i--) {
    const r = RIPPLES[i]; r.r += 4; r.life -= 0.035;
    if (r.life <= 0) { RIPPLES.splice(i, 1); continue; }
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2);
    ctx.strokeStyle = r.color + Math.floor(r.life*130).toString(16).padStart(2,'0');
    ctx.lineWidth = 1.5 * r.life; ctx.stroke();
  }
}

// ═══════════════════════════════════════════════════════════════
//  MANDALA + SPECTRUM + CONVERGENCE + HAND RENDERING
// ═══════════════════════════════════════════════════════════════

let mandalaAngle = 0, mandalaEnergy = 0, currentDepthViz = 0;

function drawMandala(ctx, W, H) {
  const cx = W/2, cy = H/2, baseR = Math.min(W,H) * (0.28 + currentDepthViz*0.08);
  mandalaAngle += 0.001 + mandalaEnergy*0.003 + currentDepthViz*0.004;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(mandalaAngle);
  for (let ring = 0; ring < 4; ring++) {
    const r = baseR*(0.3+ring*0.25), a = 0.02+mandalaEnergy*0.04+currentDepthViz*0.03;
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
    ctx.strokeStyle = `rgba(255,106,0,${a})`; ctx.lineWidth = 0.5; ctx.stroke();
    const spokes = 8+ring*4;
    for (let s = 0; s < spokes; s++) {
      const ang = (s/spokes)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(Math.cos(ang)*(r-6), Math.sin(ang)*(r-6));
      ctx.lineTo(Math.cos(ang)*(r+6), Math.sin(ang)*(r+6));
      ctx.strokeStyle = `rgba(255,160,0,${a*0.7})`; ctx.lineWidth = 0.5; ctx.stroke();
    }
  }
  const sr = baseR*0.12, a2 = 0.04+mandalaEnergy*0.08+currentDepthViz*0.06;
  for (let t = 0; t < 2; t++) {
    ctx.beginPath();
    for (let p = 0; p < 3; p++) {
      const ang = t*Math.PI/6 + (p/3)*Math.PI*2 - Math.PI/2;
      ctx[p === 0 ? 'moveTo' : 'lineTo'](Math.cos(ang)*sr, Math.sin(ang)*sr);
    }
    ctx.closePath(); ctx.strokeStyle = `rgba(255,200,50,${a2})`; ctx.lineWidth = 0.8; ctx.stroke();
  }
  ctx.restore();
}

function drawFlameSpectrum(ctx, W, H, analyser) {
  if (!analyser) return;
  const freqData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqData);
  let tot = 0; for (let i = 0; i < freqData.length; i++) tot += freqData[i];
  mandalaEnergy = (tot / (freqData.length * 255)) * 2;
  const sw = W / freqData.length;
  for (let layer = 0; layer < 3; layer++) {
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let i = 0; i < freqData.length; i++) {
      const v = freqData[i]/255, fh = v*H*(0.08+layer*0.04);
      const w = Math.sin(Date.now()*0.005+i*0.3+layer)*fh*0.15;
      const x = i*sw, y = H-fh-w;
      if (i === 0) ctx.lineTo(x, y); else ctx.quadraticCurveTo(x-sw*0.5, y+w*0.5, x, y);
    }
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = `hsla(${layer===0?5:layer===1?25:45},95%,${45+layer*10}%,${0.15-layer*0.04+mandalaEnergy*0.1})`;
    ctx.fill();
  }
}

function drawConvergence(ctx, W, H, leftWrist, rightWrist) {
  if (!leftWrist || !rightWrist) return;
  const lx=(1-leftWrist.x)*W, ly=leftWrist.y*H, rx=(1-rightWrist.x)*W, ry=rightWrist.y*H;
  const dist = Math.hypot(rx-lx, ry-ly); if (dist > W*0.6) return;
  const prox = 1-dist/(W*0.6), mx=(lx+rx)/2, my=(ly+ry)/2;
  ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(mx, my-40*prox, rx, ry);
  ctx.strokeStyle = `rgba(255,200,50,${prox*0.3})`; ctx.lineWidth = 1+prox*3;
  ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = prox*25; ctx.stroke(); ctx.shadowBlur = 0;
  if (prox > 0.4) {
    const gr = ctx.createRadialGradient(mx, my, 0, mx, my, 30+prox*40);
    gr.addColorStop(0, `rgba(255,220,80,${prox*0.3})`);
    gr.addColorStop(0.5, `rgba(255,100,0,${prox*0.15})`);
    gr.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(mx, my, 30+prox*40, 0, Math.PI*2); ctx.fill();
  }
}

function drawHands(ctx, W, H, hands, pinchState) {
  if (!hands) return;
  let leftWrist = null, rightWrist = null, maxD = 0;

  hands.forEach(hand => {
    const lms = hand.landmarks, label = hand.label, depth = hand.depth;
    const colors = FINGER_COLORS[label] || FINGER_COLORS.Right;
    maxD = Math.max(maxD, depth);

    if (label === 'Left') leftWrist = lms[0];
    if (label === 'Right') rightWrist = lms[0];

    const anyOn = FINGER_TIPS.some((_, fi) => pinchState[`${label}_${fi}`]);

    // Skeleton
    HAND_CONNECTIONS.forEach(([a, b]) => {
      const la = lms[a], lb = lms[b];
      ctx.beginPath(); ctx.moveTo((1-la.x)*W, la.y*H); ctx.lineTo((1-lb.x)*W, lb.y*H);
      ctx.strokeStyle = `rgba(255,140,50,${(anyOn?0.25:0.12)+depth*0.15})`;
      ctx.lineWidth = 1.2+depth*0.5; ctx.stroke();
    });

    // Joint dots
    lms.forEach((lm, li) => {
      if ([THUMB_TIP, ...FINGER_TIPS].includes(li)) return;
      ctx.beginPath(); ctx.arc((1-lm.x)*W, lm.y*H, 2, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255,160,80,${0.12+depth*0.12})`; ctx.fill();
    });

    // Depth ring at wrist
    const wr = lms[0], wx = (1-wr.x)*W, wy = wr.y*H, dR = 10+depth*55;
    ctx.beginPath(); ctx.arc(wx, wy, dR, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(255,${Math.floor(106-depth*60)},0,${0.08+depth*0.4})`;
    ctx.lineWidth = 0.5+depth*2; ctx.stroke();
    if (depth > 0.3) {
      ctx.beginPath(); ctx.arc(wx, wy, dR*0.5, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(255,200,50,${(depth-0.3)*0.3})`; ctx.lineWidth = 0.5; ctx.stroke();
    }
    const mc = 6+Math.floor(depth*10);
    for (let s = 0; s < mc; s++) {
      const a = (s/mc)*Math.PI*2 + mandalaAngle*3;
      ctx.beginPath();
      ctx.moveTo(wx+Math.cos(a)*(dR-4-depth*4), wy+Math.sin(a)*(dR-4-depth*4));
      ctx.lineTo(wx+Math.cos(a)*(dR+4+depth*4), wy+Math.sin(a)*(dR+4+depth*4));
      ctx.strokeStyle = `rgba(255,200,50,${0.05+depth*0.2})`; ctx.lineWidth = 0.4+depth*0.8; ctx.stroke();
    }
    if (depth > 0.4) {
      const hR = dR*1.5, hg = ctx.createRadialGradient(wx, wy, dR*0.3, wx, wy, hR);
      hg.addColorStop(0, `rgba(255,80,0,${(depth-0.4)*0.15})`); hg.addColorStop(1, 'rgba(255,40,0,0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(wx, wy, hR, 0, Math.PI*2); ctx.fill();
    }
    ctx.font = '10px DM Mono'; ctx.fillStyle = `rgba(255,180,80,${0.15+depth*0.5})`;
    ctx.fillText(`Z ${Math.floor(depth*100)}%`, wx+dR+8, wy+3);

    // Thumb
    const th = lms[THUMB_TIP], thX = (1-th.x)*W, thY = th.y*H;
    const tg = ctx.createRadialGradient(thX, thY, 0, thX, thY, 12+depth*6);
    tg.addColorStop(0, 'rgba(255,220,120,0.6)'); tg.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(thX, thY, 6+depth*4, 0, Math.PI*2); ctx.fill();

    // Fingertips
    FINGER_TIPS.forEach((tipIdx, fi) => {
      const tip = lms[tipIdx], tx = (1-tip.x)*W, ty = tip.y*H;
      const color = colors[fi], key = `${label}_${fi}`, on = pinchState[key];

      if (on) spawnFire(tx, ty, depth);

      const rawDist = Math.hypot(tx-thX, ty-thY), prox = Math.max(0, 1-rawDist/(W*0.12));
      if (prox > 0.1) {
        ctx.beginPath(); ctx.moveTo(thX, thY); ctx.lineTo(tx, ty);
        const gr = ctx.createLinearGradient(thX, thY, tx, ty);
        gr.addColorStop(0, `rgba(255,200,50,${prox*0.4})`);
        gr.addColorStop(1, color + Math.floor(prox*160).toString(16).padStart(2,'0'));
        ctx.strokeStyle = gr; ctx.lineWidth = 1.5*prox; ctx.stroke();
      }

      const gR = on ? (30+depth*20) : 14;
      const gg = ctx.createRadialGradient(tx, ty, 0, tx, ty, gR);
      if (on) { gg.addColorStop(0,'#ffeedd'); gg.addColorStop(0.3,color+'dd'); gg.addColorStop(1,color+'00'); }
      else { gg.addColorStop(0,color+'88'); gg.addColorStop(1,color+'00'); }
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(tx, ty, gR, 0, Math.PI*2); ctx.fill();

      ctx.beginPath(); ctx.arc(tx, ty, on?8:4, 0, Math.PI*2);
      ctx.fillStyle = on ? '#fff' : color; ctx.fill();

      if (on) {
        const pulse = Math.sin(Date.now()*0.008)*3;
        ctx.beginPath(); ctx.arc(tx, ty, 16+pulse+depth*8, 0, Math.PI*2);
        ctx.strokeStyle = color+'66'; ctx.lineWidth = 1.2+depth; ctx.stroke();
      }

      if (!on && prox < 0.3) {
        ctx.font = '7px DM Mono'; ctx.fillStyle = color+'55';
        ctx.textAlign = 'center'; ctx.fillText(FINGER_LABELS[fi], tx, ty+16); ctx.textAlign = 'start';
      }
    });
  });

  currentDepthViz += (maxD - currentDepthViz) * 0.08;
  return { leftWrist, rightWrist };
}

// ═══════════════════════════════════════════════════════════════
//  PYREFEY VARIANT EXPORT
// ═══════════════════════════════════════════════════════════════

export function createPyrefeyVariant() {
  let audioCtx, analyser, masterGain;
  let convolver, reverbReturn;
  let voices = {};

  function buildConvolver(ctx) {
    convolver    = ctx.createConvolver();
    reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 1.0;

    const sr = ctx.sampleRate, dur = 4, decay = 2.2;
    const buf = ctx.createBuffer(2, sr*dur, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) {
        const env = Math.pow(1 - i/d.length, decay);
        const early = i < sr*0.06 ? Math.sin(i*0.1)*0.6 : 0;
        d[i] = ((Math.random()*2 - 1)*env + early) * 0.75;
      }
    }
    convolver.buffer = buf;
    convolver.connect(reverbReturn);
    reverbReturn.connect(masterGain);
  }

  return {
    // ── SCALES (Pyrefey named tunings) ──
    scales: {
      hearth:  'pentatonic',
      shadow:  'minor',
      ritual:  'phrygian',
      arcane:  'harm_minor',
      eastern: 'in_sen',
    },

    onInit({ audioCtx: ctx, analyser: an, masterGain: mg }) {
      audioCtx   = ctx;
      analyser   = an;
      masterGain = mg;

      buildConvolver(ctx);

      // Build voices: 2 hands × 4 fingers
      voices = {};
      ['Left', 'Right'].forEach(h => {
        FINGER_TIPS.forEach((_, fi) => {
          voices[`${h}_${fi}`] = new Voice(audioCtx, masterGain, convolver, fi);
        });
      });
    },

    onNoteOn({ hand, finger, freq, vol, depth, cx, cy }) {
      const key = `${hand}_${finger}`;
      const voice = voices[key];
      if (voice) voice.noteOn(freq, vol, depth);

      const color = (FINGER_COLORS[hand] || FINGER_COLORS.Right)[finger];
      spawnBurst(cx, cy, color);
      spawnRipple(cx, cy, color);
      spawnRune(cx, cy - 35, freqToRune(freq), freqToNote(freq));
    },

    onNoteUpdate({ hand, finger, freq, vol, depth }) {
      const voice = voices[`${hand}_${finger}`];
      if (voice) voice.update(freq, vol, depth);
    },

    onNoteOff({ hand, finger, cx, cy }) {
      const voice = voices[`${hand}_${finger}`];
      if (voice) voice.noteOff();
      if (cx && cy) spawnSmoke(cx, cy);
    },

    onFrame({ hands, pinchState, canvas, ctx, W, H, analyser: an }) {
      // Clear with trail
      ctx.fillStyle = 'rgba(6,6,11,0.14)';
      ctx.fillRect(0, 0, W, H);

      // Background layers
      drawMandala(ctx, W, H);
      tickBgEmbers(ctx, W, H);
      drawFlameSpectrum(ctx, W, H, an);

      // Additive fire
      ctx.globalCompositeOperation = 'lighter';
      tickFire(ctx);
      tickBursts(ctx);
      ctx.globalCompositeOperation = 'source-over';

      // Foreground particles
      tickSmoke(ctx);
      tickRipples(ctx);
      tickRunes(ctx);

      // Hands
      const wrists = drawHands(ctx, W, H, hands, pinchState);
      drawConvergence(ctx, W, H, wrists?.leftWrist, wrists?.rightWrist);
    },
  };
}
