import { useEffect, useRef, useState } from 'react';

/**
 * Self-contained countdown: it owns its ticking state, so at 50ms updates ONLY
 * this component re-renders — the board and rest of the HUD stay untouched
 * during the memorize countdown (performance requirement).
 *
 * Pause-safe: while `running` is false it freezes at `frozenRemainingMs`;
 * on resume the engine hands back a fresh `endsAtMs` and the bar continues
 * exactly where it left off.
 */
interface TimerBarProps {
  endsAtMs: number;
  durationMs: number;
  running: boolean;
  frozenRemainingMs: number | null;
  onTimeUp: () => void;
  onTick: () => void; // fired on each of the last 3 integer seconds
}

export function TimerBar(p: TimerBarProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, p.endsAtMs - Date.now()));
  const lastSecondRef = useRef(-1);
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    lastSecondRef.current = -1;

    if (!p.running) {
      if (p.frozenRemainingMs !== null) setRemaining(Math.max(0, p.frozenRemainingMs));
      return;
    }

    const update = () => {
      const rem = Math.max(0, p.endsAtMs - Date.now());
      setRemaining(rem);
      const sec = Math.ceil(rem / 1000);
      if (sec !== lastSecondRef.current) {
        if (sec <= 3 && sec >= 1) p.onTick();
        lastSecondRef.current = sec;
      }
      if (rem <= 0 && !firedRef.current) {
        firedRef.current = true;
        p.onTimeUp();
      }
    };

    update();
    const iv = window.setInterval(update, 50);
    return () => window.clearInterval(iv);
  }, [p.running, p.endsAtMs, p.frozenRemainingMs, p.onTimeUp, p.onTick]);

  const pct = p.durationMs > 0 ? Math.max(0, Math.min(100, (remaining / p.durationMs) * 100)) : 0;
  const secs = Math.ceil(remaining / 1000);

  return (
    <div className="timerbar" role="timer" aria-label="Memorize countdown">
      <div className="timerbar-track">
        <div className={`timerbar-fill${secs <= 3 ? ' urgent' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`timerbar-secs${secs <= 3 ? ' urgent' : ''}`}>{secs}s</div>
    </div>
  );
}