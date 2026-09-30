import { Check, CheckCircle2, Crown, GitCompareArrows, Scale, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SOURCE_LABELS } from '../config/sources';
import { CATEGORY_META, SEVERITY_STYLES } from '../config/ui';
import { cn } from '../lib/cn';
import type { ConflictSeverity, FieldConflict } from '../types';
import { valuesEqual } from '../utils/engine';
import { formatAgo, formatDate, formatValue } from '../utils/format';
import { EmptyState, Panel } from './ui/Panel';
import { SourceBadge } from './ui/SourceBadge';

type SeverityFilter = 'all' | ConflictSeverity;

interface ConflictInspectorProps {
  conflicts: FieldConflict[];
  asOf: string;
  focusedField: string | null;
  onFocusField: (key: string) => void;
  className?: string;
}

const DAY_MS = 86_400_000;

export function ConflictInspector({ conflicts, asOf, focusedField, onFocusField, className }: ConflictInspectorProps) {
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
      title="Discrepancies & conflict inspector"
      icon={GitCompareArrows}
      className={className}
      meta={
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold',
            counts.critical > 0 ? 'bg-red-100 text-red-700' : counts.warning > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
          )}
        >
          {conflicts.length}
        </span>
      }
      toolbar={
        <div className="flex items-center gap-1" role="tablist" aria-label="Filter by severity">
          {(['all', 'critical', 'warning'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                'inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium capitalize transition',
                filter === key ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {key !== 'all' && (
                <span className={cn('h-1.5 w-1.5 rounded-full', key === 'critical' ? 'bg-red-500' : 'bg-amber-400')} />
              )}
              {key}
              <span className="font-mono text-[10px] text-slate-400">{counts[key]}</span>
            </button>
          ))}
        </div>
      }
    >
      {visible.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={conflicts.length === 0 ? 'All systems agree' : `No ${filter} conflicts`}
          body={
            conflicts.length === 0
              ? 'Every source reports the same value for every field at this point in time.'
              : 'Switch the filter to see the remaining discrepancies.'
          }
        />
      ) : (
        <div className="space-y-3 p-3">
          {visible.map((conflict) => (
            <ConflictCard
              key={conflict.fieldKey}
              conflict={conflict}
              asOf={asOf}
              focused={focusedField === conflict.fieldKey}
              onFocus={() => onFocusField(conflict.fieldKey)}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

interface ConflictCardProps {
  conflict: FieldConflict;
  asOf: string;
  focused: boolean;
  onFocus: () => void;
}

function ConflictCard({ conflict, asOf, focused, onFocus }: ConflictCardProps) {
  const severity = SEVERITY_STYLES[conflict.severity];
  const SeverityIcon = severity.icon;
  const distinctValues = new Set(conflict.conflictingValues.map((c) => formatValue(c.value, conflict.format).toLowerCase())).size;
  const asOfMs = Date.parse(asOf);

  return (
    <article
      id={`conflict-card-${conflict.fieldKey}`}
      className={cn(
        'scroll-m-3 overflow-hidden rounded-lg border border-l-4 border-slate-200 bg-white shadow-sm transition',
        severity.accentBorder,
        focused && 'ring-2 ring-indigo-400 ring-offset-1',
      )}
    >
      <button type="button" onClick={onFocus} className="flex w-full items-start justify-between gap-3 px-3 pt-2.5 text-left">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
                severity.pill,
              )}
            >
              <SeverityIcon className="h-3 w-3" />
              {severity.label}
            </span>
            <span className="truncate text-[10px] uppercase tracking-wider text-slate-400">
              {CATEGORY_META[conflict.category].label}
            </span>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{conflict.label}</h3>
        </div>
        <div className="shrink-0 text-right">
          {conflict.driftPct !== null && (
            <div className={cn('font-mono text-xs font-bold tabular-nums', severity.text)}>Δ {conflict.driftPct}%</div>
          )}
          <div className="text-[10px] text-slate-500">
            {conflict.conflictingValues.length} sources · {distinctValues} values
          </div>
        </div>
      </button>

      <table className="mt-2 w-full table-fixed text-xs">
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[34%]" />
          <col className="w-[20%]" />
          <col className="w-[16%]" />
        </colgroup>
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-[10px] uppercase tracking-wide text-slate-400">
            <th className="px-3 py-1 font-medium">System</th>
            <th className="py-1 pr-2 font-medium">Reported value</th>
            <th className="py-1 pr-2 font-medium">Recorded</th>
            <th className="py-1 pr-3 text-right font-medium">Authority</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {conflict.conflictingValues.map((claim, index) => {
            const isWinner = index === 0;
            const agrees = valuesEqual(claim.value, conflict.resolvedValue);
            const age = Math.max(0, Math.floor((asOfMs - Date.parse(claim.timestamp)) / DAY_MS));

            return (
              <tr key={`${claim.source}-${claim.documentId}`} className={cn(isWinner && 'bg-emerald-50/60')}>
                <td className="px-3 py-1.5 align-top">
                  <SourceBadge source={claim.source} />
                  {claim.sourceField !== conflict.fieldKey && (
                    <div className="mt-0.5 truncate font-mono text-[10px] text-slate-400" title={`Reported as ${claim.sourceField}`}>
                      as {claim.sourceField}
                    </div>
                  )}
                </td>
                <td className="py-1.5 pr-2 align-top">
                  <div className="flex items-start gap-1">
                    {isWinner ? (
                      <Crown className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" aria-label="Winning value" />
                    ) : agrees ? (
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" aria-label="Agrees with winner" />
                    ) : (
                      <X className="mt-0.5 h-3 w-3 shrink-0 text-red-400" aria-label="Disagrees with winner" />
                    )}
                    <span
                      className={cn(
                        'break-words font-medium',
                        agrees ? 'text-slate-900' : 'text-slate-500 line-through decoration-red-300',
                        conflict.format === 'number' || conflict.format === 'currency' ? 'font-mono tabular-nums' : '',
                      )}
                    >
                      {formatValue(claim.value, conflict.format)}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 pr-2 align-top text-slate-600">
                  <div className="whitespace-nowrap">{formatDate(claim.timestamp)}</div>
                  <div className="text-[10px] text-slate-400">{formatAgo(age)}</div>
                </td>
                <td className="py-1.5 pr-3 align-top">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn('h-full rounded-full', isWinner ? 'bg-emerald-500' : 'bg-slate-400')}
                        style={{ width: `${Math.min(100, claim.priority)}%` }}
                      />
                    </div>
                    <span className={cn('w-6 text-right font-mono tabular-nums', isWinner ? 'font-bold text-emerald-700' : 'text-slate-500')}>
                      {claim.priority}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="m-3 mt-2 flex gap-2 rounded-md bg-slate-50 px-2.5 py-2 text-xs leading-relaxed text-slate-600 ring-1 ring-inset ring-slate-100">
        <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
        <p>
          <span className="font-semibold text-slate-800">
            Resolved to “{formatValue(conflict.resolvedValue, conflict.format)}” from {SOURCE_LABELS[conflict.resolvedSource]}.
          </span>{' '}
          {conflict.rationale}
        </p>
      </div>
    </article>
  );
}
