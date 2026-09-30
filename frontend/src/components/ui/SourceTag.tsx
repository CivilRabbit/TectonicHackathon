import { SOURCE_LABELS } from '../../config/sources';
import { SOURCE_SWATCH } from '../../config/ui';
import { cn } from '../../lib/cn';
import type { SourceSystem } from '../../types';

interface SourceTagProps {
  source: SourceSystem;
  rank?: number;
  className?: string;
}

export function SourceTag({ source, rank, className }: SourceTagProps) {
  return (
    <span
      title={rank === undefined ? SOURCE_LABELS[source] : `${SOURCE_LABELS[source]} · rank #${rank}`}
      className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-[10px] text-zinc-300', className)}
    >
      {rank !== undefined && <span className="text-zinc-500">[#{rank}]</span>}
      <span className={cn('h-1.5 w-1.5 rounded-[1px]', SOURCE_SWATCH[source])} />
      {source}
    </span>
  );
}
