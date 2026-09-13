Chess Flash Trainer
A chess memory-training game. Pieces appear on the board for a few seconds(MEMORIZE), then vanish — rebuild the position from the side tray (RECALL) andcheck yourself. Positions matter; piece types don't. Inspired by the classicdesktop game "KGB Secrets".

Run it
npm installnpm run dev      # http://localhost:5173
Production build (also runs from file:// thanks to relative asset paths):

npm run buildnpm run preview
Tech notes
React 18 + TypeScript + Vite. Board rendered withreact-chessboard ^4.7 (pinned to the v4 line: position,onPieceDrop returning boolean, onSquareClick, customSquareStyles,modeled on the repo's MiniPuzzles example). Upgrading to v5 = move props intoan options={{…}} object and rename (customSquareStyles → squareStyles, …).
chess.js is installed and wired via src/lib/chessFoundation.ts forFUTURE modes (real puzzles, analysis, openings). The memory game intentionallydoes NOT use FEN — its positions are illegal (many kings, 24 pieces), so theengine owns a {id, color, type, square} piece model and derives a renderposition only.
Sub-8×8 grids use an active-area mask: out-of-area squares are styled as voidand every input path rejects them. Anchors: even N → file a, odd N → file b.
Audio is synthesized with WebAudio (no files, no network). Best scores andmute persist in localStorage, all access try/catch-wrapped.