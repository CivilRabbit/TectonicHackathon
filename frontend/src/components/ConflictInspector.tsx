import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import type { ConflictStatus, FieldConflict, ResolvedConflict, SourceClaim } from '../types';
import { describeResolution, getFieldDefinition } from '../utils/engine';
import { formatDate, formatValue } from '../utils/format';
import { OverrideBadge } from './ui/OverrideBadge';
import { EmptyState, Panel } from './ui/Panel';
import { SourceTag } from './ui/SourceTag';

const EXIT_MS = 220;

interface ConflictInspectorProps {
  conflicts: FieldConflict[];
  /** Resolutions recorded against conflicts that do not exist at the selected point in time. */
  otherResolutions: ResolvedConflict[];
  focusedField: string | null;
  onFocusField: (key: string) => void;
  onInspect: (conflict: FieldConflict) => void;
  onPickWinner: (conflict: FieldConflict, claim: SourceClaim) => void;
  onClearOverride: (fieldKey: string) => void;
  onResolve: (conflict: FieldConflict) => void;
  onReopen: (conflictId: string) => void;
  className?: string;
}

export function ConflictInspector({
  conflicts,
  otherResolutions,
  focusedField,
  onFocusField,
  onInspect,
  onPickWinner,
  onClearOverride,
  onResolve,
  onReopen,
  className,
}: ConflictInspectorProps) {
  const [view, setView] = useState<ConflictStatus>('active');
  const active = conflicts.filter((c) => c.status === 'active');
  const resolved = conflicts.filter((c) => c.status === 'resolved');
  const counts: Record<ConflictStatus, number> = { active: active.length, resolved: resolved.length };

  const lastFocused = useRef<string | null>(null);
  useEffect(() => {
    const changed = focusedField !== lastFocused.current;
    lastFocused.current = focusedField;
    if (!changed || !focusedField) return;
    const target = conflicts.find((c) => c.fieldKey === focusedField);
    if (!target) return;
    setView(target.status);
    const frame = window.requestAnimationFrame(() =>
      document.getElementById(`conflict-card-${focusedField}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [focusedField, conflicts]);

  return (
    <Panel
      title="Conflicts & Resolution"
      className={className}
      actions={
        <div className="flex items-center gap-px rounded-sm border border-zinc-800 bg-zinc-950 p-px" role="tablist">
          {(['active', 'resolved'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={cn(
                'h-5 rounded-[2px] px-2 font-mono text-[10px] uppercase transition',
                view === key ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {key} ({counts[key]})
            </button>
          ))}
        </div>
      }
    >
      {view === 'active' ? (
        active.length === 0 ? (
          <EmptyState
            title={conflicts.length === 0 ? 'No conflicts at this point in time.' : 'All conflicts reconciled for this snapshot.'}
          />
        ) : (
          <div className="p-2">
            {active.map((conflict) => (
              <ActiveConflictCard
                key={conflict.conflictId}
                conflict={conflict}
                focused={focusedField === conflict.fieldKey}
                onFocus={() => onFocusField(conflict.fieldKey)}
                onInspect={() => onInspect(conflict)}
                onPick={(claim) => onPickWinner(conflict, claim)}
                onClearOverride={() => onClearOverride(conflict.fieldKey)}
                onResolve={() => onResolve(conflict)}
              />
            ))}
          </div>
        )
      ) : resolved.length === 0 && otherResolutions.length === 0 ? (
        <EmptyState title="No resolved conflicts." />
      ) : (
        <div className="p-2">
          {resolved.map((conflict) => (
            <ResolvedConflictRow
              key={conflict.conflictId}
              id={`conflict-card-${conflict.fieldKey}`}
              code={conflict.code}
              label={conflict.label}
              audit={conflict.rationale}
              focused={focusedField === conflict.fieldKey}
              onFocus={() => onFocusField(conflict.fieldKey)}
              onInspect={() => onInspect(conflict)}
              onReopen={() => onReopen(conflict.conflictId)}
            />
          ))}

          {otherResolutions.length > 0 && (
            <>
              <h3 className="px-1 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-600">
                Other points in time <span className="font-mono">{otherResolutions.length}</span>
              </h3>
              {otherResolutions.map((record) => {
                const definition = getFieldDefinition(record.fieldKey);
                return (
                  <ResolvedConflictRow
                    key={record.conflictId}
                    code={definition.code}
                    label={definition.label}
                    audit={describeResolution(record)}
                    note={`Conflict as of ${formatDate(record.snapshotAsOf)}`}
                    onReopen={() => onReopen(record.conflictId)}
                  />
                );
              })}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

interface ActiveConflictCardProps {
  conflict: FieldConflict;
  focused: boolean;
  onFocus: () => void;
  onInspect: () => void;
  onPick: (claim: SourceClaim) => void;
  onClearOverride: () => void;
  onResolve: () => void;
}

function ActiveConflictCard({ conflict, focused, onFocus, onInspect, onPick, onClearOverride, onResolve }: ActiveConflictCardProps) {
  const [leaving, setLeaving] = useState(false);
  const exitTimer = useRef<number | null>(null);
  const isOverride = conflict.method === 'override';
  const numeric = conflict.format === 'number' || conflict.format === 'currency';
  const winner = conflict.conflictingValues[0];

  useEffect(
    () => () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    },
    [],
  );

  const resolve = () => {
    if (leaving) return;
    setLeaving(true);
    exitTimer.current = window.setTimeout(onResolve, EXIT_MS);
  };

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity,transform] duration-200 ease-out',
        leaving ? 'pointer-events-none translate-x-3 grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <article
          id={`conflict-card-${conflict.fieldKey}`}
          onClick={() => {
            onFocus();
            onInspect();
          }}
          className={cn(
            'mb-2 scroll-m-2 cursor-pointer rounded-sm border border-l-2 border-zinc-800 bg-zinc-950/60 transition-colors hover:border-zinc-700',
            'border-l-red-500',
            focused && 'border-zinc-600 bg-zinc-950 hover:border-zinc-600',
          )}
        >
          <header className="flex items-center gap-2 px-3 pt-2">
            <span className="font-mono text-[10px] font-semibold text-red-400">Conflict</span>
            <h3 className="truncate text-[13px] font-medium text-zinc-100">{conflict.label}</h3>
            {conflict.driftPct !== null && (
              <span className="font-mono text-[10px] tabular-nums text-red-400">Δ{conflict.driftPct}%</span>
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
                      className={cn('truncate py-1 pr-2', isWinner ? 'text-zinc-50' : 'text-zinc-500', numeric && 'font-mono tabular-nums')}
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

          <footer className="flex items-center gap-3 border-t border-zinc-800/70 px-3 py-1.5">
            <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-zinc-500">{conflict.rationale}</p>
            {isOverride && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onClearOverride();
                }}
                className="shrink-0 font-mono text-[10px] uppercase text-zinc-500 hover:text-white"
              >
                Clear override
              </button>
            )}
            <button
              type="button"
              title={`Accept ${formatValue(winner.value, conflict.format)} from ${winner.source}`}
              onClick={(event) => {
                event.stopPropagation();
                resolve();
              }}
              className="shrink-0 rounded-sm border border-zinc-300 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-900 transition hover:bg-white"
            >
              Resolve Conflict
            </button>
          </footer>
        </article>
      </div>
    </div>
  );
}

interface ResolvedConflictRowProps {
  id?: string;
  code: string;
  label: string;
  audit: string;
  note?: string;
  focused?: boolean;
  onFocus?: () => void;
  onInspect?: () => void;
  onReopen: () => void;
}

function ResolvedConflictRow({ id, code, label, audit, note, focused, onFocus, onInspect, onReopen }: ResolvedConflictRowProps) {
  return (
    <article
      id={id}
      onClick={onFocus}
      className={cn(
        'mb-2 scroll-m-2 rounded-sm border border-zinc-800/80 bg-zinc-950/30 px-3 py-2',
        onFocus && 'cursor-pointer hover:border-zinc-700',
        focused && 'border-zinc-600',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-emerald-400/70">✓</span>
        <h3 className="truncate text-xs text-zinc-300">{label}</h3>
        <span className="font-mono text-[10px] text-zinc-600">{code}</span>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {onInspect && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onInspect();
              }}
              className="font-mono text-[10px] uppercase text-zinc-600 hover:text-zinc-200"
            >
              Inspect ↗
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onReopen();
            }}
            className="rounded-sm border border-zinc-700 px-1.5 font-mono text-[10px] uppercase leading-4 text-zinc-400 transition hover:border-zinc-400 hover:text-white"
          >
            Unresolve / Reopen
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">{audit}</p>
      {note && <p className="mt-0.5 font-mono text-[10px] text-zinc-600">{note}</p>}
    </article>
  );
}
