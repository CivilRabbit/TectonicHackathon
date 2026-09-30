import { SOURCE_LABELS } from '../../config/sources';
import { SOURCE_STYLES } from '../../config/ui';
import { cn } from '../../lib/cn';
import type { SourceSystem } from '../../types';

interface SourceBadgeProps {
  source: SourceSystem;
  priority?: number;
  className?: string;
}

export function SourceBadge({ source, priority, className }: SourceBadgeProps) {
  const style = SOURCE_STYLES[source];
  const label = SOURCE_LABELS[source];

  return (
    <span
      title={priority === undefined ? label : `${label} · authority priority ${priority}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
        style.badge,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {label}
      {priority !== undefined && <span className="font-mono font-medium opacity-75">[Priority: {priority}]</span>}
    </span>
  );
}
