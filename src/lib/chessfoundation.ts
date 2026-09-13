import { Chess } from 'chess.js';

/**
 * Foundation for FUTURE modes only (real mate-in-2 puzzles, analysis board,
 * opening trainer). The memory game deliberately does NOT use chess.js: its
 * positions are intentionally illegal (multiple kings, 24 pieces, pawns on any
 * square), so FEN can't be the source of truth. This module keeps the real-
 * chess pathway installed, typed, and one import away.
 */
export interface RealChessBoard {
  fen(): string;
  legalMoves(): string[];
  makeMoveSan(san: string): boolean;
  isCheckmate(): boolean;
  isGameOver(): boolean;
}

export function createRealChessBoard(fen?: string): RealChessBoard | null {
  try {
    const game = fen ? new Chess(fen) : new Chess();
    return {
      fen: () => game.fen(),
      legalMoves: () => game.moves(),
      makeMoveSan: (san) => {
        try {
          game.move(san);
          return true;
        } catch {
          return false;
        }
      },
      isCheckmate: () => game.isCheckmate(),
      isGameOver: () => game.isGameOver(),
    };
  } catch {
    return null; // invalid FEN etc. — never crash the app
  }
}