/** All localStorage access is wrapped in try/catch: the game must survive
 *  file:// contexts, private browsing, and disabled storage without crashing. */

const BEST_PREFIX = 'cft.best.';
const MUTE_KEY = 'cft.muted';

export function loadBestScore(difficulty: string): number {
  try {
    const raw = window.localStorage.getItem(BEST_PREFIX + difficulty);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(difficulty: string, score: number): void {
  try {
    window.localStorage.setItem(BEST_PREFIX + difficulty, String(score));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function loadMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}