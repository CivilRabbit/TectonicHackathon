import { X } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ModalProps {
  title: string;
  /** Rendered after the title in the header bar. */
  headerContent?: ReactNode;
  headerActions?: ReactNode;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

/** Fixed, centred overlay. Closes on Esc and backdrop click; locks page scroll while open. */
export function Modal({ title, headerContent, headerActions, onClose, className, children }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'flex max-h-full w-full flex-col rounded-md border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black',
          className,
        )}
      >
        <header className="flex min-h-11 shrink-0 items-center gap-3 border-b border-zinc-800 px-4 py-2">
          <h2 id={titleId} className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-200">
            {title}
          </h2>
          {headerContent}
          <div className="ml-auto flex items-center gap-3">
            {headerActions}
            <button
              type="button"
              autoFocus
              aria-label="Close"
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
