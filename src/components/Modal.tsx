import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  variant?: 'solid' | 'success' | 'error';
  // 'solid' = near-opaque backdrop (pause hides the board — no cheating).
}

export function Modal({ title, children, variant }: ModalProps) {
  return (
    <div className={`overlay${variant ? ` ${variant}` : ''}`}>
      <div className="modal" role="dialog" aria-label={title}>
        <h2 className="modal-title">{title}</h2>
        {children}
      </div>
    </div>
  );
}