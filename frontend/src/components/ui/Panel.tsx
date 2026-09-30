import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface PanelProps {
  title: string;
  icon: LucideIcon;
  meta?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, icon: Icon, meta, actions, toolbar, children, className }: PanelProps) {
  return (
    <section
      className={cn('flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}
    >
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-indigo-600" />
          <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
          {meta}
        </div>
        {actions}
      </header>
      {toolbar && <div className="border-b border-slate-100 bg-slate-50/60 px-3 py-2">{toolbar}</div>}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50">
        <Icon className="h-5 w-5 text-emerald-600" />
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="max-w-xs text-xs text-slate-500">{body}</p>
    </div>
  );
}
