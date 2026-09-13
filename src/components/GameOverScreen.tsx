import { useEffect, useState } from 'react';
import { getDifficulty } from '../game/config';
import type { DifficultyKey, RoundRecord } from '../game/types';
import { loadBestScore, saveBestScore } from '../lib/storage';
import { playSound } from '../audio/sfx';

interface GameOverScreenProps {
  outcome: 'win' | 'lose';
  score: number;
  difficultyKey: DifficultyKey;
  record: RoundRecord[];
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
}

export function GameOverScreen(p: GameOverScreenProps) {
  const [best, setBest] = useState(() => loadBestScore(p.difficultyKey));
  const [newBest, setNewBest] = useState(false);

  // Save-once semantics: saving the same value twice (StrictMode) is harmless.
  useEffect(() => {
    const stored = loadBestScore(p.difficultyKey);
    if (p.score > stored) {
      saveBestScore(p.difficultyKey, p.score);
      setBest(p.score);
      setNewBest(true);
    } else {
      setBest(stored);
    }
  }, [p.difficultyKey, p.score]);

  const d = getDifficulty(p.difficultyKey);

  return (
    <div className="screen gameover-screen">
      <h1 className={`title ${p.outcome}`}>
        {p.outcome === 'win' ? 'Mission Complete' : 'Cover Blown'}
      </h1>
      <p className="tagline">
        {p.outcome === 'win'
          ? `Every round of ${d.name} cleared. Your memory is a weapon.`
          : 'Out of retries. The layout fades to black…'}
      </p>

      <div className="score-block">
        <div className="final-score">{p.score}</div>
        <div className="best-line">
          Best ({d.name}): {best}
          {newBest && <span className="new-best">New best!</span>}
        </div>
      </div>

      <table className="record-table">
        <thead>
          <tr>
            <th>Round</th><th>Grid</th><th>Pieces</th><th>Result</th><th>Checks</th>
          </tr>
        </thead>
        <tbody>
          {p.record.map((r) => (
            <tr key={r.round} className={r.won ? 'won' : 'lost'}>
              <td>{r.round}</td>
              <td>{r.grid}×{r.grid}</td>
              <td>{r.pieces}</td>
              <td>{r.won ? '✔ won' : '✘ lost'}</td>
              <td>{r.checksUsed}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="modal-buttons">
        <button className="btn primary" onClick={() => { playSound('click'); p.onPlayAgain(); }}>
          Play Again
        </button>
        <button className="btn ghost" onClick={() => { playSound('click'); p.onChangeDifficulty(); }}>
          Change Difficulty
        </button>
      </div>
    </div>
  );
}