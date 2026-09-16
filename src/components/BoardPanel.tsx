import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { FILES } from '../game/config';

/**
 * Wraps react-chessboard (v4 API, package pinned ^4.7.0).
 *
 * Active-area CROPPING: react-chessboard always renders an 8×8 grid, but this
 * game only needs the N×N active area. We keep a full 8×8 board internally and
 * crop the visible box down to the active area (overflow: hidden + negative
 * offsets), sizing the container so only the active area occupies layout space.
 * The anchor logic here MUST mirror config.activeSquaresFor:
 *   even N → anchored at file a, odd N → anchored at file b.
 *
 * Responsive sizing: react-chessboard needs a numeric `boardWidth`, so we
 * measure the frame's available width (ResizeObserver, first measure in
 * useLayoutEffect to avoid an oversized first paint) and solve for the internal
 * board size: boardWidth = visibleSize × 8 / grid.
 */
const MAX_VISIBLE_SIZE = 470;
const MIN_VISIBLE_SIZE = 240;

interface BoardPanelProps {
  grid: number; // active grid size (4..8) — drives the crop geometry
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
  const [boardWidth, setBoardWidth] = useState(MAX_VISIBLE_SIZE);

  const grid = p.grid;
  const startFileIndex = grid % 2 === 0 ? 0 : 1; // mirrors activeSquaresFor()
  const visibleSize = (boardWidth * grid) / 8;
  const offsetX = startFileIndex * (boardWidth / 8);  // hidden columns on the left
  const offsetY = ((8 - grid) * boardWidth) / 8;      // hidden rows on top

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const cs = window.getComputedStyle(el);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const avail = el.clientWidth - pad;
      const visible = Math.max(MIN_VISIBLE_SIZE, Math.min(MAX_VISIBLE_SIZE, avail));
      setBoardWidth((visible * 8) / grid); // solve internal 8×8 size from desired visible size
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [grid]);

  useEffect(() => {
    if (p.shakeKey === 0) return;
    setShaking(true);
    const t = window.setTimeout(() => setShaking(false), 420);
    return () => window.clearTimeout(t);
  }, [p.shakeKey]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    for (const sq of p.flash.green) {
      styles[sq] = { backgroundColor: '#6fce7d', transition: 'background-color 90ms linear' };
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
  }, [p.flash, p.cursorSquare, p.interactable]);

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

  // Active-area squares in top-down row order, for the tray drop grid.
  const dropSquares: string[] = [];
  for (let rank = grid; rank >= 1; rank--) {
    for (let c = 0; c < grid; c++) dropSquares.push(`${FILES[startFileIndex + c]}${rank}`);
  }

  // Coordinate labels for just the active files/ranks.
  const labelFiles = FILES.slice(startFileIndex, startFileIndex + grid);

  return (
    <div ref={frameRef} className={`board-frame${shaking ? ' shaking' : ''}`}>
      <div className="board-inner" style={{ width: visibleSize, height: visibleSize }}>
        {/* The full 8×8 board, shifted so only the active area is inside the
            visible box. Clipped content can't receive pointer events, so
            squares outside the active area are unreachable by mouse/touch. */}
        <div style={{ position: 'absolute', left: -offsetX, top: -offsetY }}>
          <Chessboard
            position={p.position}
            boardWidth={boardWidth}
            showCoordinates={false}
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
        </div>

        {/* Coordinate labels over the visible area (pointer-events: none). */}
        <div className="square-labels" aria-hidden>
          {labelFiles.map((f, i) => (
            <span
              key={f}
              className="sq-label file"
              style={{ left: `${(i * 100) / grid + 50 / grid}%` }}
            >
              {f.toUpperCase()}
            </span>
          ))}
          {Array.from({ length: grid }, (_, i) => grid - i).map((r) => (
            <span
              key={r}
              className="sq-label rank"
              style={{ top: `${((grid - r) * 100) / grid + 50 / grid}%` }}
            >
              {r}
            </span>
          ))}
        </div>

        {/* Native HTML5 drop-catcher for tray drags (desktop only — iOS Safari
            has no HTML5 drag; tap-piece-then-tap-square is the touch path).
            Covers only the visible active area, sized to the grid. */}
        {p.trayDragPieceId !== null && (
          <div
            className="tray-drop-layer"
            style={{
              gridTemplateColumns: `repeat(${grid}, 1fr)`,
              gridTemplateRows: `repeat(${grid}, 1fr)`,
            }}
          >
            {dropSquares.map((sq) => (
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
