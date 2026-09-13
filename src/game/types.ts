/** Core data models for Chess Flash Trainer. */

export type PieceColor = 'w' | 'b';
export type PieceType = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';

/**
 * The game's source of truth. Positions here are deliberately NOT legal chess
 * positions (many kings, 24 pieces, pawns anywhere), so we never use FEN as
 * state — we derive a plain render-position for react-chessboard instead.
 */
export interface Piece {
  id: string;
  color: PieceColor;
  type: PieceType;
  square: string | null; // null = piece is in the tray
}

export type DifficultyKey = 'easy' | 'medium' | 'hard' | 'expert';

export interface RoundConfig {
  grid: number;    // active grid size (4..8)
  pieces: number;  // pieces to memorize
  seconds: number; // memorize countdown
}

export interface DifficultyDef {
  key: DifficultyKey;
  name: string;
  blurb: string;
  rounds: RoundConfig[];
}

export type Phase =
  | 'menu'
  | 'memorize'
  | 'recall'
  | 'review'    // green/red flash after a check, before the result overlay
  | 'roundover' // result modal is up
  | 'paused'
  | 'gameover';

export interface RoundRecord {
  round: number;      // 1-based
  grid: number;
  pieces: number;
  won: boolean;
  checksUsed: number;
}

export interface RoundResult {
  won: boolean;
  points: number;
  perfect: boolean;
  wrongSquares: string[];
}

export type SoundName =
  | 'click' | 'select' | 'place' | 'pickup' | 'buzz'
  | 'wrong' | 'correct' | 'tick' | 'win' | 'lose';

export interface GameState {
  phase: Phase;
  pausedFrom: Phase | null;
  difficulty: DifficultyKey;
  roundIndex: number;          // 0-based
  layoutToken: number;         // increments on every NEW layout (round start / restart level)
  config: RoundConfig;
  pieces: Piece[];
  activeSquares: string[];     // squares inside the N×N active area
  solutionSquares: string[];   // target layout — matching is POSITION-ONLY
  retriesLeft: number;
  checksUsed: number;          // this round
  score: number;
  roundResult: RoundResult | null;
  sessionRecord: RoundRecord[];
  outcome: 'win' | 'lose' | null;
  flash: { green: string[]; red: string[] };
  memorizeEndsAt: number | null;
  pausedRemainingMs: number | null;
  soundEvent: { id: number; name: SoundName } | null;
}