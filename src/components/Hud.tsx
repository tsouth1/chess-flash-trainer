import type { Phase } from '../game/types';

interface HudProps {
  difficultyName: string;
  roundNumber: number; // 1-based
  totalRounds: number;
  grid: number;
  pieces: number;
  phase: Phase;
  score: number;
  retriesLeft: number;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
}

const PHASE_LABEL: Record<Phase, string> = {
  menu: '',
  memorize: 'Phase: Memorize',
  recall: 'Phase: Recall',
  review: 'Phase: Checking…',
  roundover: 'Phase: Round over',
  paused: 'Phase: Paused',
  gameover: '',
};

export function Hud(p: HudProps) {
  return (
    <header className="hud">
      <div className="hud-left">
        <span className="hud-round">
          Round {p.roundNumber}/{p.totalRounds} • {p.difficultyName} • {p.grid}×{p.grid} • {p.pieces} pcs
        </span>
        <span className="hud-phase">{PHASE_LABEL[p.phase]}</span>
      </div>
      <div className="hud-right">
        <span className="hud-dots" title="Retries left">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`dot${i < p.retriesLeft ? ' full' : ''}`}>●</span>
          ))}
        </span>
        <span className="hud-score">Score: {p.score}</span>
        <button className="btn icon" onClick={p.onToggleMute} title={p.muted ? 'Unmute' : 'Mute'}>
          {p.muted ? '🔇' : '🔊'}
        </button>
        <button className="btn icon" onClick={p.onPause} title="Pause (Esc)">⏸</button>
      </div>
    </header>
  );
}