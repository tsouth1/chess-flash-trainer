import { Modal } from './Modal';

interface RoundResultModalProps {
  won: boolean;
  points: number;
  perfect: boolean;
  retriesLeft: number;
  wrongCount: number;
  isLastRound: boolean;
  onNext: () => void;
  onRetry: () => void;
  onQuit: () => void;
}

export function RoundResultModal(p: RoundResultModalProps) {
  if (p.won) {
    return (
      <Modal title="Round Clear!" variant="success">
        <p className="points">+{p.points} points</p>
        {p.perfect && <p className="perfect-badge">★ PERFECT — no retries used!</p>}
        <div className="modal-buttons">
          <button className="btn primary" autoFocus onClick={p.onNext}>
            {p.isLastRound ? 'See Results' : 'Next Round'}
          </button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title="Not quite!" variant="error">
      <p className="modal-text">
        {p.wrongCount} square{p.wrongCount === 1 ? '' : 's'} didn’t match the memorized layout.
      </p>
      <p className="modal-text">
        Retries left: <span className="hud-dots">
          {'●'.repeat(p.retriesLeft)}
          {'○'.repeat(Math.max(0, 3 - p.retriesLeft))}
        </span>
      </p>
      <div className="modal-buttons">
        <button className="btn primary" autoFocus onClick={p.onRetry}>Retry — same layout</button>
        <button className="btn ghost" onClick={p.onQuit}>Quit to Menu</button>
      </div>
    </Modal>
  );
}