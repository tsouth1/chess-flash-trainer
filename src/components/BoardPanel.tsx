import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { ALL_SQUARES, ALL_SQUARES_TOP_DOWN, FILES } from '../game/config';

/**
 * Wraps react-chessboard (v4 API, package pinned ^4.7.0).
 *
 * Responsive sizing: react-chessboard needs a numeric `boardWidth`, so we
 * measure the frame's available width with a ResizeObserver and pass the
 * computed value — capped at 470px, shrinking on phones. The initial measure
 * runs in useLayoutEffect so there's no oversized first paint.
 */
const MAX_BOARD_WIDTH = 470;

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
  const frameRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(MAX_BOARD_WIDTH);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const cs = window.getComputedStyle(el);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const avail = el.clientWidth - pad;
      setBoardWidth(Math.max(240, Math.min(MAX_BOARD_WIDTH, avail)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    <div ref={frameRef} className={`board-frame${shaking ? ' shaking' : ''}`}>
      <div className="board-inner" style={{ width: boardWidth, height: boardWidth }}>
        <Chessboard
          position={p.position}
          boardWidth={boardWidth}
          arePiecesDraggable={p.interactable}
          animationDurationInMs={180}
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

        {/* Native HTML5 drop-catcher for tray drags (desktop only — iOS Safari
            has no HTML5 drag; tap-piece-then-tap-square is the touch path). */}
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
                  if (id) p.onPlaceFromTray(sq, id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
