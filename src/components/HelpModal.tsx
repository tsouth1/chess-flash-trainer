import { Modal } from './Modal';

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How to Play">
      <div className="help">
        <ol>
          <li><b>Memorize:</b> pieces appear on the bright active area for a few seconds.</li>
          <li><b>Recall:</b> the board empties — drag pieces from the tray back onto their squares.</li>
          <li><b>Check:</b> a matching position wins the round. Wrong squares flash red; you have 3 retries (max 4 checks).</li>
          <li>Only <b>where</b> pieces stand matters — piece types and colors don’t.</li>
          <li>Scoring: pieces × 10 × round, plus a perfect bonus of 30 × round if you needed no retries.</li>
          <li><b>Retry</b> (after a failed check) keeps the same layout. <b>Restart Level (R)</b> deals a brand-new one.</li>
        </ol>
        <h3>Controls</h3>
        <ul className="controls-list">
          <li><b>Mouse:</b> drag tray pieces onto squares; drag placed pieces to move them; click a placed piece to return it.</li>
          <li><b>Touch:</b> tap a tray piece, then tap a square.</li>
          <li><b>Keyboard:</b> arrows move the dashed cursor • Tab cycles tray pieces • Enter/Space places or picks up (with everything placed, Enter checks) • Backspace picks up.</li>
          <li><b>R</b> restart level • <b>Esc</b> pause / cancel selection • <b>Enter</b> during memorize = “I’m Ready”.</li>
        </ul>
      </div>
      <div className="modal-buttons">
        <button className="btn primary" onClick={onClose}>Got it</button>
      </div>
    </Modal>
  );
}