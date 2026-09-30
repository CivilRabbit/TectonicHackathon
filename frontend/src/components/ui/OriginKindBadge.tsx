import { ORIGIN_ICONS, ORIGIN_LABELS } from '../../config/origins';
import { cn } from '../../lib/cn';
import type { SourceKind } from '../../types';

export function OriginKindBadge({ kind, className }: { kind: SourceKind; className?: string }) {
  const Icon = ORIGIN_ICONS[kind];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {ORIGIN_LABELS[kind]}
    </span>
  );
}
