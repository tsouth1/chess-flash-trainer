import type { DifficultyDef, DifficultyKey, Piece, PieceColor, PieceType, RoundConfig } from './types';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** a1..h8 rank-ascending. */
export const ALL_SQUARES: string[] = FILES.flatMap((f) => RANKS.map((r) => `${f}${r}`));

/** a8..h1 row-major (top-left first) — matches the 8×8 CSS drop-grid order. */
export const ALL_SQUARES_TOP_DOWN: string[] = [...RANKS]
  .reverse()
  .flatMap((r) => FILES.map((f) => `${f}${r}`));

export const DIFFICULTIES: Record<DifficultyKey, DifficultyDef> = {
  easy: {
    key: 'easy',
    name: 'Easy',
    blurb: '3 rounds · grids 4×4 → 6×6 · 4–8 pieces · 15–8s memorize',
    rounds: [
      { grid: 4, pieces: 4, seconds: 15 },
      { grid: 5, pieces: 6, seconds: 12 },
      { grid: 6, pieces: 8, seconds: 8 },
    ],
  },
  medium: {
    key: 'medium',
    name: 'Medium',
    blurb: '4 rounds · grids 4×4 → 7×7 · 4–12 pieces · 15–7s memorize',
    rounds: [
      { grid: 4, pieces: 4, seconds: 15 },
      { grid: 5, pieces: 6, seconds: 12 },
      { grid: 6, pieces: 10, seconds: 9 },
      { grid: 7, pieces: 12, seconds: 7 },
    ],
  },
  hard: {
    key: 'hard',
    name: 'Hard',
    blurb: '4 rounds · grids 5×5 → 8×8 · 6–16 pieces · 12–5s memorize',
    rounds: [
      { grid: 5, pieces: 6, seconds: 12 },
      { grid: 6, pieces: 8, seconds: 9 },
      { grid: 7, pieces: 12, seconds: 6 },
      { grid: 8, pieces: 16, seconds: 5 },
    ],
  },
  expert: {
    key: 'expert',
    name: 'Expert',
    blurb: '4 rounds · grids 6×6 → 8×8 · 8–24 pieces · 9–3s memorize',
    rounds: [
      { grid: 6, pieces: 8, seconds: 9 },
      { grid: 7, pieces: 12, seconds: 6 },
      { grid: 8, pieces: 16, seconds: 4 },
      { grid: 8, pieces: 24, seconds: 3 },
    ],
  },
};

const DIFFICULTY_ORDER: DifficultyKey[] = ['easy', 'medium', 'hard', 'expert'];

export function difficultyList(): DifficultyDef[] {
  return DIFFICULTY_ORDER.map((k) => DIFFICULTIES[k]);
}

/** Unknown/missing difficulty falls back to Easy (spec requirement). */
export function getDifficulty(key: string): DifficultyDef {
  return (DIFFICULTIES as Record<string, DifficultyDef | undefined>)[key] ?? DIFFICULTIES.easy;
}

/**
 * Active-area anchors (from the spec, treated as authoritative):
 *   even N → anchor at file a  (4×4 → a1–d4, 6×6 → a1–f6, 8×8 → a1–h8)
 *   odd  N → anchor at file b  (5×5 → b1–f5, 7×7 → b1–h7)
 *
 * ASSUMPTION: with these exact anchors the bottom-right active square is LIGHT
 * for odd N (f5, h7) and DARK for even N (d4, f6, h8). The spec's "bottom-right
 * is light" wording conflicts with its own anchor examples for even N; the
 * enumerated anchors win. Gameplay is unaffected either way.
 */
export function activeSquaresFor(grid: number): string[] {
  const startFileIndex = grid % 2 === 0 ? 0 : 1;
  const squares: string[] = [];
  for (let rank = 1; rank <= grid; rank++) {
    for (let c = 0; c < grid; c++) squares.push(`${FILES[startFileIndex + c]}${rank}`);
  }
  return squares;
}

const PIECE_TYPES: PieceType[] = ['P', 'N', 'B', 'R', 'Q', 'K'];

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Distinct random squares + half white/half black (round up for white) + random types, shuffled. */
export function generateRoundLayout(cfg: RoundConfig, rng: () => number = Math.random): Piece[] {
  const targetSquares = shuffle(activeSquaresFor(cfg.grid), rng).slice(0, cfg.pieces);
  const colors: PieceColor[] = [];
  const whiteCount = Math.ceil(cfg.pieces / 2);
  for (let i = 0; i < cfg.pieces; i++) colors.push(i < whiteCount ? 'w' : 'b');
  const shuffledColors = shuffle(colors, rng);
  return targetSquares.map((square, i) => ({
    id: `p${i + 1}`,
    color: shuffledColors[i],
    type: PIECE_TYPES[Math.floor(rng() * PIECE_TYPES.length)],
    square,
  }));
}

/** points = pieces × 10 × roundNumber, + PERFECT bonus 30 × roundNumber when zero retries used. */
export function scoreForRound(
  cfg: RoundConfig,
  roundNumber: number,
  retriesUsed: number,
): { points: number; perfect: boolean } {
  const perfect = retriesUsed === 0;
  return {
    perfect,
    points: cfg.pieces * 10 * roundNumber + (perfect ? 30 * roundNumber : 0),
  };
}