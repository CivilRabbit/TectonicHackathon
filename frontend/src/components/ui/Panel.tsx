import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface PanelProps {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, meta, actions, children, className }: PanelProps) {
  return (
    <section className={cn('flex min-h-0 flex-col rounded-md border border-zinc-800 bg-zinc-900', className)}>
      <header className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-200">{title}</h2>
          {meta}
        </div>
        {actions}
      </header>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-1 px-6 py-10 text-center">
      <p className="font-mono text-xs text-zinc-300">{title}</p>
      {body && <p className="max-w-xs text-xs text-zinc-500">{body}</p>}
    </div>
  );
}
