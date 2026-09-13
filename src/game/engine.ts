import { useEffect, useMemo, useReducer, useRef } from 'react';
import { activeSquaresFor, generateRoundLayout, getDifficulty, scoreForRound } from './config';
import { playSound } from '../audio/sfx';
import type { DifficultyKey, GameState, Piece, RoundRecord, SoundName } from './types';

export const RETRIES_PER_ROUND = 3;
const REVIEW_FLASH_MS = 1100; // how long green/red squares flash before the overlay

export function createInitialState(): GameState {
  return {
    phase: 'menu',
    pausedFrom: null,
    difficulty: 'easy',
    roundIndex: 0,
    layoutToken: 0,
    config: { grid: 4, pieces: 4, seconds: 15 },
    pieces: [],
    activeSquares: activeSquaresFor(4),
    solutionSquares: [],
    retriesLeft: RETRIES_PER_ROUND,
    checksUsed: 0,
    score: 0,
    roundResult: null,
    sessionRecord: [],
    outcome: null,
    flash: { green: [], red: [] },
    memorizeEndsAt: null,
    pausedRemainingMs: null,
    soundEvent: null,
  };
}

export type GameAction =
  | { type: 'START_GAME'; difficulty: DifficultyKey }
  | { type: 'READY' }
  | { type: 'TIME_UP' }
  | { type: 'PLACE_PIECE'; pieceId: string; square: string }
  | { type: 'PICKUP_PIECE'; pieceId: string }
  | { type: 'PICKUP_SQUARE'; square: string }
  | { type: 'CHECK' }
  | { type: 'SHOW_RESULT' }
  | { type: 'NEXT_ROUND' }
  | { type: 'RETRY' }
  | { type: 'RESTART_LEVEL' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'RESUME' }
  | { type: 'QUIT_TO_MENU' };

export interface GameActions {
  startGame(difficulty: DifficultyKey): void;
  ready(): void;
  timeUp(): void;
  place(pieceId: string, square: string): void;
  pickupPiece(pieceId: string): void;
  pickupSquare(square: string): void;
  check(): void;
  nextRound(): void;
  retry(): void;
  restartLevel(): void;
  togglePause(): void;
  resume(): void;
  quitToMenu(): void;
}

export interface GameEngine {
  state: GameState;
  actions: GameActions;
}

/* ---------- pure helpers (reducer-internal) ---------- */

/** Attach a one-shot sound event; the hook effect plays it exactly once. */
function withSound(state: GameState, name: SoundName): GameState {
  const id = (state.soundEvent?.id ?? 0) + 1;
  return { ...state, soundEvent: { id, name } };
}

/** Deal a fresh round at `roundIndex`. Date.now() here is deliberately
 *  pragmatic (timer anchor); it has no observable double-invoke effect. */
function beginRound(state: GameState, roundIndex: number): GameState {
  const def = getDifficulty(state.difficulty);
  const index = Math.min(roundIndex, def.rounds.length - 1);
  const cfg = def.rounds[index];
  const pieces = generateRoundLayout(cfg);
  return {
    ...state,
    phase: 'memorize',
    pausedFrom: null,
    roundIndex: index,
    layoutToken: state.layoutToken + 1,
    config: cfg,
    pieces,
    activeSquares: activeSquaresFor(cfg.grid),
    solutionSquares: pieces.map((p) => p.square as string),
    retriesLeft: RETRIES_PER_ROUND,
    checksUsed: 0,
    roundResult: null,
    flash: { green: [], red: [] },
    memorizeEndsAt: Date.now() + cfg.seconds * 1000,
    pausedRemainingMs: null,
  };
}

function clearBoard(pieces: Piece[]): Piece[] {
  return pieces.map((p) => (p.square === null ? p : { ...p, square: null }));
}

function resumeState(state: GameState): GameState {
  const back = state.pausedFrom ?? 'recall';
  return {
    ...state,
    phase: back,
    pausedFrom: null,
    memorizeEndsAt:
      back === 'memorize' ? Date.now() + (state.pausedRemainingMs ?? 0) : null,
    pausedRemainingMs: null,
  };
}

/* ---------- reducer ---------- */

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return withSound(
        beginRound({ ...createInitialState(), difficulty: action.difficulty }, 0),
        'click',
      );

    case 'READY': // "I'm Ready!" — skip memorize immediately
      if (state.phase !== 'memorize') return state;
      return withSound(
        { ...state, phase: 'recall', memorizeEndsAt: null, pausedRemainingMs: null, pieces: clearBoard(state.pieces) },
        'click',
      );

    case 'TIME_UP':
      if (state.phase !== 'memorize') return state;
      return {
        ...state,
        phase: 'recall',
        memorizeEndsAt: null,
        pausedRemainingMs: null,
        pieces: clearBoard(state.pieces),
      };

    case 'PLACE_PIECE': {
      if (state.phase !== 'recall') return state;
      const piece = state.pieces.find((p) => p.id === action.pieceId);
      if (!piece || !state.activeSquares.includes(action.square)) return state;
      const occupied = state.pieces.some((p) => p.square === action.square && p.id !== piece.id);
      if (occupied) return withSound(state, 'buzz'); // UI pre-validates; this is a safety net
      return withSound(
        {
          ...state,
          pieces: state.pieces.map((p) => (p.id === piece.id ? { ...p, square: action.square } : p)),
        },
        'place',
      );
    }

    case 'PICKUP_PIECE': {
      if (state.phase !== 'recall') return state;
      const piece = state.pieces.find((p) => p.id === action.pieceId);
      if (!piece || piece.square === null) return state;
      return withSound(
        { ...state, pieces: state.pieces.map((p) => (p.id === piece.id ? { ...p, square: null } : p)) },
        'pickup',
      );
    }

    case 'PICKUP_SQUARE': {
      if (state.phase !== 'recall') return state;
      const piece = state.pieces.find((p) => p.square === action.square);
      if (!piece) return state;
      return withSound(
        { ...state, pieces: state.pieces.map((p) => (p.id === piece.id ? { ...p, square: null } : p)) },
        'pickup',
      );
    }

    case 'CHECK': {
      if (state.phase !== 'recall') return state; // also guards double-fire during review
      const occ = state.pieces.filter((p) => p.square).map((p) => p.square as string);
      const occSet = new Set(occ);
      const solSet = new Set(state.solutionSquares);
      // Match by POSITION ONLY — piece types/colors are irrelevant (spatial memory).
      const wrong = [
        ...new Set([
          ...occ.filter((s) => !solSet.has(s)),
          ...state.solutionSquares.filter((s) => !occSet.has(s)),
        ]),
      ];
      const won = wrong.length === 0;
      const retriesUsed = state.checksUsed; // checks completed BEFORE this one
      const { points, perfect } = won
        ? scoreForRound(state.config, state.roundIndex + 1, retriesUsed)
        : { points: 0, perfect: false };
      const retriesLeft = won ? state.retriesLeft : state.retriesLeft - 1;
      return withSound(
        {
          ...state,
          phase: 'review',
          checksUsed: state.checksUsed + 1,
          retriesLeft,
          score: state.score + points,
          roundResult: { won, points, perfect, wrongSquares: wrong },
          flash: won
            ? { green: state.solutionSquares, red: [] }
            : { green: [], red: wrong },
        },
        won ? 'correct' : 'wrong',
      );
    }

    case 'SHOW_RESULT': {
      if (state.phase !== 'review' || !state.roundResult) return state;
      const r = state.roundResult;
      const entry: RoundRecord = {
        round: state.roundIndex + 1,
        grid: state.config.grid,
        pieces: state.config.pieces,
        won: r.won,
        checksUsed: state.checksUsed,
      };
      const record = [...state.sessionRecord, entry];
      if (r.won) {
        // Even the final round pauses on the overlay ("See Results"), so the
        // victory fanfare fires on NEXT_ROUND below.
        return { ...state, phase: 'roundover', sessionRecord: record };
      }
      if (state.retriesLeft > 0) {
        return { ...state, phase: 'roundover' }; // "Not quite!" overlay
      }
      return withSound(
        { ...state, phase: 'gameover', outcome: 'lose', sessionRecord: record, flash: { green: [], red: [] } },
        'lose',
      );
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'roundover' || !state.roundResult?.won) return state;
      const def = getDifficulty(state.difficulty);
      if (state.roundIndex >= def.rounds.length - 1) {
        return withSound(
          { ...state, phase: 'gameover', outcome: 'win', flash: { green: [], red: [] } },
          'win',
        );
      }
      return beginRound(state, state.roundIndex + 1);
    }

    case 'RETRY': // post-fail retry: SAME layout, board reset to empty
      if (state.phase !== 'roundover' || state.roundResult?.won) return state;
      return withSound(
        {
          ...state,
          phase: 'recall',
          pieces: clearBoard(state.pieces),
          flash: { green: [], red: [] },
          roundResult: null,
        },
        'click',
      );

    case 'RESTART_LEVEL': // fresh layout, retries restored, score & round kept
      if (state.phase !== 'memorize' && state.phase !== 'recall' && state.phase !== 'paused') return state;
      return withSound(beginRound(state, state.roundIndex), 'click');

    case 'TOGGLE_PAUSE': {
      if (state.phase === 'paused') return withSound(resumeState(state), 'click');
      if (state.phase !== 'memorize' && state.phase !== 'recall') return state;
      return withSound(
        {
          ...state,
          phase: 'paused',
          pausedFrom: state.phase,
          pausedRemainingMs:
            state.memorizeEndsAt !== null ? Math.max(0, state.memorizeEndsAt - Date.now()) : null,
        },
        'click',
      );
    }

    case 'RESUME':
      if (state.phase !== 'paused') return state;
      return withSound(resumeState(state), 'click');

    case 'QUIT_TO_MENU':
      return createInitialState();

    default:
      return state;
  }
}

/* ---------- derived selectors (pure, reusable) ---------- */

/** Derive the render position for react-chessboard ('e4' → 'wK' style codes). */
export function renderPosition(pieces: Piece[]): Record<string, string> {
  const pos: Record<string, string> = {};
  for (const p of pieces) {
    if (p.square) pos[p.square] = p.color + p.type;
  }
  return pos;
}

export function occupiedSquares(pieces: Piece[]): Set<string> {
  const set = new Set<string>();
  for (const p of pieces) if (p.square) set.add(p.square);
  return set;
}

/* ---------- the hook ---------- */

export function useGameEngine(): GameEngine {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const playedSoundRef = useRef(0);

  // Drain exactly-once sound events produced by the reducer.
  useEffect(() => {
    if (state.soundEvent && state.soundEvent.id !== playedSoundRef.current) {
      playedSoundRef.current = state.soundEvent.id;
      playSound(state.soundEvent.name);
    }
  }, [state.soundEvent]);

  // review → result overlay after the flash finishes.
  useEffect(() => {
    if (state.phase !== 'review') return;
    const t = window.setTimeout(() => dispatch({ type: 'SHOW_RESULT' }), REVIEW_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [state.phase]);

  const actions = useMemo<GameActions>(
    () => ({
      startGame: (difficulty) => dispatch({ type: 'START_GAME', difficulty }),
      ready: () => dispatch({ type: 'READY' }),
      timeUp: () => dispatch({ type: 'TIME_UP' }),
      place: (pieceId, square) => dispatch({ type: 'PLACE_PIECE', pieceId, square }),
      pickupPiece: (pieceId) => dispatch({ type: 'PICKUP_PIECE', pieceId }),
      pickupSquare: (square) => dispatch({ type: 'PICKUP_SQUARE', square }),
      check: () => dispatch({ type: 'CHECK' }),
      nextRound: () => dispatch({ type: 'NEXT_ROUND' }),
      retry: () => dispatch({ type: 'RETRY' }),
      restartLevel: () => dispatch({ type: 'RESTART_LEVEL' }),
      togglePause: () => dispatch({ type: 'TOGGLE_PAUSE' }),
      resume: () => dispatch({ type: 'RESUME' }),
      quitToMenu: () => dispatch({ type: 'QUIT_TO_MENU' }),
    }),
    [],
  );

  return { state, actions };
}