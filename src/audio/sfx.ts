import type { SoundName } from '../game/types';
import { loadMuted, saveMuted } from '../lib/storage';

/** Fully synthesized WebAudio SFX — no audio files, no network. Every entry
 *  point is guarded so an audio failure can never crash the game. */

let ctx: AudioContext | null = null;
let muted = loadMuted();

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* audio unavailable — game continues silently */
  }
}

export function getMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  saveMuted(m);
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

interface ToneOpts {
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  at?: number;       // seconds of delay
  slideTo?: number;  // pitch slide target (Hz)
}

function tone(freq: number, opts: ToneOpts = {}): void {
  if (muted) return;
  try {
    unlockAudio();
    if (!ctx) return;
    const { dur = 0.08, type = 'triangle', gain = 0.12, at = 0, slideTo } = opts;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    /* ignore */
  }
}

export function playSound(name: SoundName): void {
  switch (name) {
    case 'click':  tone(640, { dur: 0.05, gain: 0.07 }); break;
    case 'select': tone(880, { dur: 0.06, gain: 0.09 }); break;
    case 'place':
      tone(520, { dur: 0.07, type: 'square', gain: 0.08 });
      tone(780, { dur: 0.09, type: 'square', gain: 0.06, at: 0.05 });
      break;
    case 'pickup': tone(780, { dur: 0.07, type: 'square', gain: 0.08, slideTo: 500 }); break;
    case 'buzz':   tone(150, { dur: 0.18, type: 'sawtooth', gain: 0.12, slideTo: 110 }); break;
    case 'wrong':
      tone(220, { dur: 0.15, type: 'sawtooth', gain: 0.11 });
      tone(160, { dur: 0.22, type: 'sawtooth', gain: 0.11, at: 0.14 });
      break;
    case 'correct':
      tone(523, { dur: 0.10, gain: 0.10 });
      tone(659, { dur: 0.10, gain: 0.10, at: 0.09 });
      tone(784, { dur: 0.16, gain: 0.10, at: 0.18 });
      break;
    case 'tick':   tone(1150, { dur: 0.04, type: 'sine', gain: 0.09 }); break;
    case 'win':
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        tone(f, { dur: 0.14, type: 'square', gain: 0.09, at: i * 0.12 }),
      );
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((f, i) =>
        tone(f, { dur: 0.22, type: 'sine', gain: 0.11, at: i * 0.18 }),
      );
      break;
  }
}