import { useState } from 'react';
import { difficultyList } from '../game/config';
import type { DifficultyKey } from '../game/types';
import { loadBestScore } from '../lib/storage';
import { getMuted, playSound, toggleMuted } from '../audio/sfx';
import { HelpModal } from './HelpModal';

interface MenuScreenProps {
  onStart: (difficulty: DifficultyKey) => void;
}

export function MenuScreen({ onStart }: MenuScreenProps) {
  const [muted, setMuted] = useState(getMuted());
  const [help, setHelp] = useState(false);

  return (
    <div className="screen menu-screen">
      <button
        className="btn icon corner"
        title={muted ? 'Unmute' : 'Mute'}
        onClick={() => setMuted(toggleMuted())}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <h1 className="title">Chess Flash Trainer</h1>
      <p className="tagline">Memorize the board. Rebuild it from memory. Don’t get caught.</p>

      <div className="cards">
        {difficultyList().map((d) => {
          const best = loadBestScore(d.key);
          return (
            <button
              key={d.key}
              className="card"
              onClick={() => {
                playSound('click');
                onStart(d.key);
              }}
            >
              <span className="card-name">{d.name}</span>
              <span className="card-blurb">{d.blurb}</span>
              <span className="card-best">Best: {best > 0 ? best : '—'}</span>
            </button>
          );
        })}
      </div>

      <button className="btn ghost" onClick={() => { playSound('click'); setHelp(true); }}>
        How to Play
      </button>
      <p className="credit">Inspired by the classic “KGB Secrets” memory trainer.</p>

      {help && <HelpModal onClose={() => setHelp(false)} />}
    </div>
  );
}