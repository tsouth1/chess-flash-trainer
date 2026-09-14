import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { ALL_SQUARES, ALL_SQUARES_TOP_DOWN, FILES } from '../game/config';

/**
 * Wraps react-chessboard. Written against the v4 API (package is pinned to
 * ^4.7.0, so npm can never install the restructured v5). If you later upgrade
 * to react-chessboard v5, these props move into an `options={{ ... }}` object
 * and are renamed (position → options.position, customSquareStyles →
 * options.squareStyles, etc.) — see the v5 README.
 *
 * Patterns mirrored from the repo's MiniPuzzles example: controlled `position`
 * object, onPieceDrop returning true/false for accept/snapback, and
 * customSquareStyles for overlays (void mask, flashes, keyboard cursor).
 *
 * Sub-8×8 grids: react-chessboard always renders 8×8, so squares outside the
 * active area are painted as dark "void" squares and all inputs (drops, clicks,
 * tray drops) are rejected there by validation.
 */
const BOARD_WIDTH = 470;
const VOID_STYLE: CSSProperties = {
  backgroundColor: '#3c4038',
  boxShadow: 'inset 0 0 12px rgba(0,0,0,.55)',
};

interface BoardPanelProps {
  position: Record<string, string>;
  interactable: boolean; // only true during the recall phase
  activeSquares: ReadonlySet<string>;
  occupiedSquares: ReadonlySet<string>;
  flash: { green: string[]; red: string[] };
  cursorSquare: string | null;
  dragOverSquare: string | null; // hover highlight for native tray drags
  trayDragPieceId: string | null;
  onMovePiece: (from: string, to: string) => boolean;
  onPlaceFromTray: (square: string, pieceId: string) => boolean;
  onSquareClick: (square: string) => void;
  onInvalidDrop: (message: string) => void;
  onDragOverSquareChange: (square: string | null) => void;
  shakeKey: number; // increment to trigger the shake animation
}

export function BoardPanel(p: BoardPanelProps) {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (p.shakeKey === 0) return;
    setShaking(true);
    const t = window.setTimeout(() => setShaking(false), 420);
    return () => window.clearTimeout(t);
  }, [p.shakeKey]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    for (const sq of ALL_SQUARES) {
      if (!p.activeSquares.has(sq)) styles[sq] = { ...VOID_STYLE };
    }
    for (const sq of p.flash.green) {
      styles[sq] = { ...styles[sq], backgroundColor: '#6fce7d', transition: 'background-color 90ms linear' };
    }
    for (const sq of p.flash.red) {
      styles[sq] = { ...styles[sq], backgroundColor: '#e56b6b', transition: 'background-color 90ms linear' };
    }
    if (p.interactable && p.cursorSquare) {
      styles[p.cursorSquare] = {
        ...styles[p.cursorSquare],
        outline: '3px dashed #2563eb',
        outlineOffset: '-3px',
      };
    }
    return styles;
  }, [p.activeSquares, p.flash, p.cursorSquare, p.interactable]);

  const handlePieceDrop = (source: string, target: string): boolean => {
    if (!p.interactable) return false;
    if (source === target) return true;
    if (!p.activeSquares.has(target)) {
      p.onInvalidDrop('Outside the active area!');
      return false;
    }
    if (p.occupiedSquares.has(target)) {
      p.onInvalidDrop('That square is already occupied!');
      return false;
    }
    return p.onMovePiece(source, target);
  };

  const dropAllowed = (sq: string) => p.activeSquares.has(sq) && !p.occupiedSquares.has(sq);

  return (
    <div className={`board-frame${shaking ? ' shaking' : ''}`}>
      <div className="board-inner">
        <Chessboard
          position={p.position}
          boardWidth={BOARD_WIDTH}
          arePiecesDraggable={p.interactable}
          animationDurationIn={180}
          customDarkSquareStyle={{ backgroundColor: '#769656' }}
          customLightSquareStyle={{ backgroundColor: '#eeeed2' }}
          customSquareStyles={squareStyles}
          customBoardStyle={{ borderRadius: '4px' }}
          onPieceDrop={handlePieceDrop}
          onSquareClick={(square) => {
            if (p.interactable) p.onSquareClick(square);
          }}
        />

        {/* Coordinate labels: files A–H, ranks 1–8 (pointer-events: none). */}
        <div className="square-labels" aria-hidden>
          {FILES.map((f, i) => (
            <span key={f} className="sq-label file" style={{ left: `${i * 12.5 + 6.25}%` }}>
              {f.toUpperCase()}
            </span>
          ))}
          {[8, 7, 6, 5, 4, 3, 2, 1].map((r, i) => (
            <span key={r} className="sq-label rank" style={{ top: `${i * 12.5 + 6.25}%` }}>
              {r}
            </span>
          ))}
        </div>

        {/* Native HTML5 drop-catcher for tray drags (react-chessboard only
            handles drags that start on the board itself). Only mounted while a
            tray drag is in flight, so it never interferes with board drags. */}
        {p.trayDragPieceId !== null && (
          <div className="tray-drop-layer">
            {ALL_SQUARES_TOP_DOWN.map((sq) => (
              <div
                key={sq}
                className={`drop-cell${p.dragOverSquare === sq ? (dropAllowed(sq) ? ' ok' : ' bad') : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  p.onDragOverSquareChange(sq);
                }}
                onDragLeave={() => p.onDragOverSquareChange(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain');
                  p.onDragOverSquareChange(null);
                  if (id) p.onPlaceFromTray(sq, id); // drop layer ignores the tray-drag id; the transfer id is the truth
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
