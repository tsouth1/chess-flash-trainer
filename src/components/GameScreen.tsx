import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameActions } from '../game/engine';
import { occupiedSquares, renderPosition } from '../game/engine';
import { getDifficulty } from '../game/config';
import type { GameState } from '../game/types';
import { getMuted, playSound, toggleMuted } from '../audio/sfx';
import { BoardPanel } from './BoardPanel';
import { PieceTray } from './PieceTray';
import { Hud } from './Hud';
import { TimerBar } from './TimerBar';
import { Toast } from './Toast';
import { Modal } from './Modal';
import { HelpModal } from './HelpModal';
import { RoundResultModal } from './RoundResultModal';

interface GameScreenProps {
  state: GameState;
  actions: GameActions;
}

export function GameScreen({ state, actions }: GameScreenProps) {
  const def = getDifficulty(state.difficulty);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trayDragId, setTrayDragId] = useState<string | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const [cursorLocal, setCursorLocal] = useState({ c: 0, r: 0 }); // 0,0 = bottom-left of active area
  const [cursorVisible, setCursorVisible] = useState(false);
  const [help, setHelp] = useState(false);
  const [muted, setMuted] = useState(getMuted());
  const toastTimer = useRef<number | undefined>(undefined);

  const grid = state.config.grid;

  /* -------- derived data (memoized) -------- */
  const activeSet = useMemo(() => new Set(state.activeSquares), [state.activeSquares]);
  const occupied = useMemo(() => occupiedSquares(state.pieces), [state.pieces]);
  const trayPieces = useMemo(() => state.pieces.filter((x) => x.square === null), [state.pieces]);
  const position = useMemo(() => renderPosition(state.pieces), [state.pieces]);
  const allPlaced = trayPieces.length === 0;
  const interactable = state.phase === 'recall';
  const cursorSquare = state.activeSquares[cursorLocal.r * grid + cursorLocal.c] ?? null;
  const isLastRound = state.roundIndex >= def.rounds.length - 1;

  /* -------- reset transient UI on every NEW layout -------- */
  useEffect(() => {
    setSelectedId(null);
    setTrayDragId(null);
    setDragOverSquare(null);
    setCursorVisible(false);
    setCursorLocal({ c: Math.floor((grid - 1) / 2), r: Math.floor((grid - 1) / 2) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.layoutToken]);

  /* -------- feedback helpers -------- */
  const showToast = useCallback((msg: string) => {
    setToast({ id: Date.now(), msg });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1700);
  }, []);

  const invalidFeedback = useCallback(
    (msg: string) => {
      playSound('buzz');
      setShakeKey((k) => k + 1);
      showToast(msg);
    },
    [showToast],
  );

  /* -------- interaction handlers -------- */

  const tryPlaceFromTray = useCallback(
    (square: string, pieceId: string): boolean => {
      if (!activeSet.has(square)) {
        invalidFeedback('Outside the active area!');
        return false;
      }
      if (occupied.has(square)) {
        invalidFeedback('That square is already occupied!');
        return false;
      }
      actions.place(pieceId, square);
      setSelectedId(null);
      return true;
    },
    [activeSet, occupied, actions, invalidFeedback],
  );

  const handleMovePiece = useCallback(
    (from: string, to: string): boolean => {
      const piece = state.pieces.find((x) => x.square === from);
      if (!piece) return false;
      if (!activeSet.has(to)) {
        invalidFeedback('Outside the active area!');
        return false;
      }
      if (occupied.has(to)) {
        invalidFeedback('That square is already occupied!');
        return false;
      }
      actions.place(piece.id, to);
      return true;
    },
    [state.pieces, activeSet, occupied, actions, invalidFeedback],
  );

  const handleSquareClick = useCallback(
    (square: string) => {
      if (state.phase !== 'recall') return;
      const piece = state.pieces.find((x) => x.square === square);
      if (piece) {
        actions.pickupPiece(piece.id);
        setSelectedId(null);
        return;
      }
      if (selectedId) {
        tryPlaceFromTray(square, selectedId);
        return;
      }
      playSound('click');
    },
    [state.phase, state.pieces, selectedId, actions, tryPlaceFromTray],
  );

  const handleTraySelect = useCallback((id: string | null) => {
    if (id) playSound('select');
    setSelectedId(id);
  }, []);

  const handleTimeUp = useCallback(() => actions.timeUp(), [actions]);
  const handleTick = useCallback(() => playSound('tick'), []);

  /* -------- keyboard controls (mouse + touch flows are pure React events) -------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (help) {
        if (e.key === 'Escape') setHelp(false);
        return;
      }
      if (e.key === 'Escape') {
        // Esc during a drag/selection cancels it first; otherwise toggles pause.
        if (trayDragId || selectedId || dragOverSquare) {
          setTrayDragId(null);
          setSelectedId(null);
          setDragOverSquare(null);
          return;
        }
        if (state.phase === 'memorize' || state.phase === 'recall') actions.togglePause();
        return;
      }
      if (
        (e.key === 'r' || e.key === 'R') &&
        (state.phase === 'memorize' || state.phase === 'recall' || state.phase === 'paused')
      ) {
        actions.restartLevel();
        return;
      }
      if (state.phase === 'paused') {
        if (e.key === 'Enter') actions.resume();
        return;
      }
      if (state.phase === 'roundover') {
        if (e.key === 'Enter') {
          if (state.roundResult?.won) actions.nextRound();
          else actions.retry();
        }
        return;
      }
      if (state.phase === 'memorize') {
        if (e.key === 'Enter') actions.ready();
        return;
      }
      if (state.phase !== 'recall') return;

      const move = (dc: number, dr: number) => {
        e.preventDefault();
        setCursorVisible(true);
        setCursorLocal((prev) => ({
          c: Math.min(grid - 1, Math.max(0, prev.c + dc)),
          r: Math.min(grid - 1, Math.max(0, prev.r + dr)),
        }));
        playSound('click');
      };

      switch (e.key) {
        case 'ArrowUp':    move(0, 1); return;  // local r grows toward rank N (up the board)
        case 'ArrowDown':  move(0, -1); return;
        case 'ArrowLeft':  move(-1, 0); return;
        case 'ArrowRight': move(1, 0); return;
        case 'Tab': {
          e.preventDefault();
          const ids = state.pieces.filter((x) => x.square === null).map((x) => x.id);
          if (ids.length === 0) {
            setSelectedId(null); // tray empty → let Tab behave normally next time
            return;
          }
          setSelectedId((prev) => {
            const i = prev ? ids.indexOf(prev) : -1;
            return ids[(i + 1) % ids.length];
          });
          playSound('select');
          return;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          setCursorVisible(true);
          const sq = state.activeSquares[cursorLocal.r * grid + cursorLocal.c];
          if (!sq) return;
          if (selectedId) {
            tryPlaceFromTray(sq, selectedId);
            return;
          }
          const piece = state.pieces.find((x) => x.square === sq);
          if (piece) {
            actions.pickupPiece(piece.id);
            return;
          }
          if (allPlaced) actions.check(); // keyboard-only players can finish the round
          return;
        }
        case 'Backspace':
        case 'Delete': {
          e.preventDefault();
          setCursorVisible(true);
          const sq = state.activeSquares[cursorLocal.r * grid + cursorLocal.c];
          const piece = sq ? state.pieces.find((x) => x.square === sq) : undefined;
          if (piece) actions.pickupPiece(piece.id);
          return;
        }
      }
    };
    // Re-subscribing every render keeps all closures fresh — listener setup is cheap.
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* -------- render -------- */
  const showTimer =
    state.phase === 'memorize' || (state.phase === 'paused' && state.pausedFrom === 'memorize');
  const trayVisible =
    state.phase === 'recall' || (state.phase === 'paused' && state.pausedFrom === 'recall');

  const hint =
    state.phase === 'memorize'
      ? `Memorize the ${state.config.pieces} pieces — press Enter or “I’m Ready!” when set.`
      : state.phase === 'recall'
        ? 'Rebuild the position. Only square positions matter — piece types don’t.'
        : state.phase === 'paused'
          ? 'Paused. The clock is frozen.'
          : state.phase === 'review'
            ? 'Checking…'
            : '';

  return (
    <div className="screen game-screen">
      <Hud
        difficultyName={def.name}
        roundNumber={state.roundIndex + 1}
        totalRounds={def.rounds.length}
        grid={grid}
        pieces={state.config.pieces}
        phase={state.phase}
        score={state.score}
        retriesLeft={state.retriesLeft}
        muted={muted}
        onPause={() => actions.togglePause()}
        onToggleMute={() => setMuted(toggleMuted())}
      />

      {showTimer && state.memorizeEndsAt !== null && (
        <TimerBar
          key={state.layoutToken}
          endsAtMs={state.memorizeEndsAt}
          durationMs={state.config.seconds * 1000}
          running={state.phase === 'memorize'}
          frozenRemainingMs={state.pausedRemainingMs}
          onTimeUp={handleTimeUp}
          onTick={handleTick}
        />
      )}

      {state.phase === 'recall' && (
        <div className="recall-note">
          Recall phase — take your time. {state.config.pieces - trayPieces.length}/{state.config.pieces} placed
        </div>
      )}

      <div className="game-layout">
        <BoardPanel
          grid={grid}
          showCoordinates={false}
          position={position}
          interactable={interactable}
          activeSquares={activeSet}
          occupiedSquares={occupied}
          flash={state.flash}
          cursorSquare={cursorVisible && interactable ? cursorSquare : null}
          dragOverSquare={dragOverSquare}
          trayDragPieceId={trayDragId}
          onMovePiece={handleMovePiece}
          onPlaceFromTray={tryPlaceFromTray}
          onSquareClick={handleSquareClick}
          onInvalidDrop={invalidFeedback}
          onDragOverSquareChange={setDragOverSquare}
          shakeKey={shakeKey}
        />

        <aside className="side-panel">
          <PieceTray
            pieces={trayPieces}
            selectedId={selectedId}
            visible={trayVisible}
            onSelect={handleTraySelect}
            onDragStateChange={setTrayDragId}
          />
          <p className="hint">{hint}</p>
          <div className="action-buttons">
            {state.phase === 'memorize' && (
              <button className="btn primary" onClick={() => actions.ready()}>I’m Ready!</button>
            )}
            {state.phase === 'recall' && (
              <button
                className="btn primary"
                disabled={!allPlaced}
                onClick={() => actions.check()}
              >
                Check Board
              </button>
            )}
            {(state.phase === 'memorize' || state.phase === 'recall' || state.phase === 'paused') && (
              <button className="btn ghost" onClick={() => actions.restartLevel()}>
                Restart Level (R)
              </button>
            )}
          </div>
          <button className="btn link" onClick={() => setHelp(true)}>How to play</button>
        </aside>
      </div>

      {state.phase === 'paused' && (
        <Modal title="Paused" variant="solid">
          <p className="modal-text">The clock is frozen. Sneaky.</p>
          <div className="modal-buttons">
            <button className="btn primary" autoFocus onClick={() => actions.resume()}>Resume</button>
            <button className="btn ghost" onClick={() => actions.restartLevel()}>Restart Level</button>
            <button className="btn ghost" onClick={() => actions.startGame(state.difficulty)}>Restart Game</button>
            <button className="btn ghost" onClick={() => actions.quitToMenu()}>Quit to Menu</button>
          </div>
        </Modal>
      )}

      {state.phase === 'roundover' && state.roundResult && (
        <RoundResultModal
          won={state.roundResult.won}
          points={state.roundResult.points}
          perfect={state.roundResult.perfect}
          retriesLeft={state.retriesLeft}
          wrongCount={state.roundResult.wrongSquares.length}
          isLastRound={isLastRound}
          onNext={() => actions.nextRound()}
          onRetry={() => actions.retry()}
          onQuit={() => actions.quitToMenu()}
        />
      )}

      {help && <HelpModal onClose={() => setHelp(false)} />}
      <Toast toast={toast} />
    </div>
  );
}
