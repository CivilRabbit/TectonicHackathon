import { useEffect, useState } from 'react';
import { SEVERITY_STYLES } from '../config/ui';
import { cn } from '../lib/cn';
import type { ConflictSeverity, FieldConflict, SourceClaim } from '../types';
import { formatDate, formatValue } from '../utils/format';
import { OverrideBadge } from './ui/OverrideBadge';
import { EmptyState, Panel } from './ui/Panel';
import { SourceTag } from './ui/SourceTag';

type SeverityFilter = 'all' | ConflictSeverity;

interface ConflictInspectorProps {
  conflicts: FieldConflict[];
  focusedField: string | null;
  onFocusField: (key: string) => void;
  onInspect: (conflict: FieldConflict) => void;
  onPickWinner: (conflict: FieldConflict, claim: SourceClaim) => void;
  onClearOverride: (fieldKey: string) => void;
  className?: string;
}

export function ConflictInspector({
  conflicts,
  focusedField,
  onFocusField,
  onInspect,
  onPickWinner,
  onClearOverride,
  className,
}: ConflictInspectorProps) {
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const counts: Record<SeverityFilter, number> = {
    all: conflicts.length,
    critical: conflicts.filter((c) => c.severity === 'critical').length,
    warning: conflicts.filter((c) => c.severity === 'warning').length,
  };
  const visible = filter === 'all' ? conflicts : conflicts.filter((c) => c.severity === filter);

  useEffect(() => {
    if (!focusedField) return;
    const target = conflicts.find((c) => c.fieldKey === focusedField);
    if (!target) return;
    if (filter !== 'all' && target.severity !== filter) {
      setFilter('all');
      return;
    }
    document.getElementById(`conflict-card-${focusedField}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusedField, conflicts, filter]);

  return (
    <Panel
      title="Conflicts & Resolution"
      className={className}
      meta={<span className="font-mono text-[10px] text-zinc-500">{conflicts.length}</span>}
      actions={
        <div className="flex items-center gap-px rounded-sm border border-zinc-800 bg-zinc-950 p-px" role="tablist">
          {(['all', 'critical', 'warning'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                'h-5 rounded-[2px] px-2 font-mono text-[10px] uppercase transition',
                filter === key ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {key === 'all' ? 'All' : SEVERITY_STYLES[key].tag} {counts[key]}
            </button>
          ))}
        </div>
      }
    >
      {visible.length === 0 ? (
        <EmptyState
          title={conflicts.length === 0 ? 'No conflicts' : `No ${SEVERITY_STYLES[filter as ConflictSeverity].tag} conflicts`}
          body={conflicts.length === 0 ? 'All sources agree at this point in time.' : undefined}
        />
      ) : (
        <div className="space-y-2 p-2">
          {visible.map((conflict) => (
            <ConflictCard
              key={conflict.fieldKey}
              conflict={conflict}
              focused={focusedField === conflict.fieldKey}
              onFocus={() => onFocusField(conflict.fieldKey)}
              onInspect={() => onInspect(conflict)}
              onPick={(claim) => onPickWinner(conflict, claim)}
              onClearOverride={() => onClearOverride(conflict.fieldKey)}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

interface ConflictCardProps {
  conflict: FieldConflict;
  focused: boolean;
  onFocus: () => void;
  onInspect: () => void;
  onPick: (claim: SourceClaim) => void;
  onClearOverride: () => void;
}

function ConflictCard({ conflict, focused, onFocus, onInspect, onPick, onClearOverride }: ConflictCardProps) {
  const severity = SEVERITY_STYLES[conflict.severity];
  const isOverride = conflict.resolution === 'override';
  const numeric = conflict.format === 'number' || conflict.format === 'currency';

  return (
    <article
      id={`conflict-card-${conflict.fieldKey}`}
      onClick={() => {
        onFocus();
        onInspect();
      }}
      className={cn(
        'scroll-m-2 cursor-pointer rounded-sm border border-l-2 border-zinc-800 bg-zinc-950/60 transition-colors hover:border-zinc-700',
        severity.edge,
        focused && 'border-zinc-600 bg-zinc-950 hover:border-zinc-600',
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-2">
        <span className={cn('font-mono text-[10px] font-semibold', severity.text)}>{severity.tag}</span>
        <h3 className="truncate text-[13px] font-medium text-zinc-100">{conflict.label}</h3>
        {conflict.driftPct !== null && (
          <span className={cn('font-mono text-[10px] tabular-nums', severity.text)}>Δ{conflict.driftPct}%</span>
        )}
        {isOverride && <OverrideBadge />}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onFocus();
            onInspect();
          }}
          className="ml-auto shrink-0 font-mono text-[10px] uppercase text-zinc-500 hover:text-zinc-100"
        >
          Inspect ↗
        </button>
      </header>

      <table className="mt-1.5 w-full table-fixed text-xs">
        <colgroup>
          <col className="w-10" />
          <col className="w-24" />
          <col />
          <col className="w-24" />
          <col className="w-16" />
        </colgroup>
        <tbody>
          {conflict.conflictingValues.map((claim, index) => {
            const isWinner = index === 0;
            return (
              <tr key={`${claim.source}-${claim.documentId}`} className={cn('border-t border-zinc-800/70', isWinner && 'bg-zinc-800/60')}>
                <td className="py-1 pl-3 font-mono text-[10px] text-zinc-500">#{claim.rank}</td>
                <td className="py-1">
                  <SourceTag source={claim.source} />
                </td>
                <td
                  className={cn(
                    'truncate py-1 pr-2',
                    isWinner ? 'text-zinc-50' : 'text-zinc-500',
                    numeric && 'font-mono tabular-nums',
                  )}
                  title={formatValue(claim.value, conflict.format)}
                >
                  {formatValue(claim.value, conflict.format)}
                </td>
                <td className="py-1 font-mono text-[10px] text-zinc-500">{formatDate(claim.timestamp)}</td>
                <td className="py-1 pr-3 text-right">
                  {isWinner ? (
                    <span className="font-mono text-[10px] uppercase text-zinc-300">{isOverride ? 'Pinned' : 'Winner'}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onPick(claim);
                      }}
                      className="rounded-sm border border-zinc-700 px-1.5 font-mono text-[10px] uppercase leading-4 text-zinc-300 transition hover:border-zinc-400 hover:text-white"
                    >
                      Use
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <footer className="flex items-start gap-3 border-t border-zinc-800/70 px-3 py-1.5">
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-zinc-500">{conflict.rationale}</p>
        {isOverride && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClearOverride();
            }}
            className="shrink-0 font-mono text-[10px] uppercase text-zinc-400 hover:text-white"
          >
            Clear override
          </button>
        )}
      </footer>
    </article>
  );
}
