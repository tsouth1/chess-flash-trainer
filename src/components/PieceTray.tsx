import type { Piece, PieceType } from '../game/types';

/** Filled glyphs for both colors, tinted via CSS; \uFE0E forces text (non-emoji) rendering. */
const GLYPH: Record<PieceType, string> = {
  K: '♚\uFE0E', Q: '♛\uFE0E', R: '♜\uFE0E', B: '♝\uFE0E', N: '♞\uFE0E', P: '♟\uFE0E',
};

interface PieceTrayProps {
  pieces: Piece[]; // unplaced pieces only (square === null)
  selectedId: string | null;
  visible: boolean; // hidden during memorize (pieces are on the board)
  onSelect: (id: string | null) => void;
  onDragStateChange: (id: string | null) => void;
}

export function PieceTray(p: PieceTrayProps) {
  if (!p.visible) {
    return (
      <div className="tray">
        <div className="tray-title">Tray</div>
        <div className="tray-empty">Pieces are on the board — memorize them!</div>
      </div>
    );
  }
  return (
    <div className="tray">
      <div className="tray-title">Tray ({p.pieces.length} left)</div>
      {p.pieces.length === 0 ? (
        <div className="tray-empty">All pieces placed — hit “Check Board”!</div>
      ) : (
        <div className="tray-grid">
          {p.pieces.map((piece) => (
            <button
              key={piece.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', piece.id);
                e.dataTransfer.effectAllowed = 'move';
                p.onSelect(piece.id);
                p.onDragStateChange(piece.id);
              }}
              onDragEnd={() => p.onDragStateChange(null)}
              onClick={() => p.onSelect(p.selectedId === piece.id ? null : piece.id)}
              className={`tray-piece ${piece.color}${p.selectedId === piece.id ? ' selected' : ''}`}
              title={`${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`}
            >
              <span className="glyph">{GLYPH[piece.type]}</span>
              <span className="mini-type">{piece.type}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}