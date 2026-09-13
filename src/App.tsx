import { useEffect } from 'react';
import { useGameEngine } from './game/engine';
import { unlockAudio } from './audio/sfx';
import { MenuScreen } from './components/MenuScreen';
import { GameScreen } from './components/GameScreen';
import { GameOverScreen } from './components/GameOverScreen';

export default function App() {
  const { state, actions } = useGameEngine();

  // Create/resume the AudioContext on the first user gesture (required by browsers).
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  if (state.phase === 'menu') {
    return (
      <MenuScreen
        onStart={(difficulty) => {
          unlockAudio();
          actions.startGame(difficulty);
        }}
      />
    );
  }

  if (state.phase === 'gameover' && state.outcome) {
    return (
      <GameOverScreen
        outcome={state.outcome}
        score={state.score}
        difficultyKey={state.difficulty}
        record={state.sessionRecord}
        onPlayAgain={() => actions.startGame(state.difficulty)}
        onChangeDifficulty={() => actions.quitToMenu()}
      />
    );
  }

  return <GameScreen state={state} actions={actions} />;
}