import { ChevronDown, FileDiff, FilePlus2, Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { CHANGE_STYLES } from '../config/ui';
import { cn } from '../lib/cn';
import type { DiffChangeType, FieldChange, SnapshotDiff } from '../types';
import { formatDate, formatSignedDelta, formatValue } from '../utils/format';
import { EmptyState, Panel } from './ui/Panel';
import { SourceBadge } from './ui/SourceBadge';

interface DiffPanelProps {
  diff: SnapshotDiff;
  focusedField: string | null;
  onFocusField: (key: string) => void;
  className?: string;
}

const SUMMARY_ORDER: DiffChangeType[] = ['added', 'modified', 'removed', 'unchanged'];

export function DiffPanel({ diff, focusedField, onFocusField, className }: DiffPanelProps) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const changed = [...diff.added, ...diff.modified, ...diff.removed];
  const counts: Record<DiffChangeType, number> = {
    added: diff.added.length,
    modified: diff.modified.length,
    removed: diff.removed.length,
    unchanged: diff.unchanged.length,
  };

  return (
    <Panel
      title="Changes since last snapshot"
      icon={FileDiff}
      className={className}
      meta={
        <span className="truncate text-[11px] text-slate-500">
          {diff.fromDate ? `vs ${formatDate(diff.fromDate)}` : 'initial snapshot'}
        </span>
      }
      toolbar={
        <div className="grid grid-cols-4 gap-1.5">
          {SUMMARY_ORDER.map((type) => (
            <div key={type} className={cn('rounded-md px-2 py-1 text-center ring-1 ring-inset', CHANGE_STYLES[type].badge)}>
              <div className="font-mono text-sm font-bold tabular-nums">{counts[type]}</div>
              <div className="text-[10px] font-medium">{CHANGE_STYLES[type].label}</div>
            </div>
          ))}
        </div>
      }
    >
      {!diff.fromDate && (
        <div className="flex items-start gap-2 border-b border-slate-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-900">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
          First point on the timeline. Every field is new.
        </div>
      )}

      <Section title="Documents ingested" count={diff.ingestedDocuments.length}>
        {diff.ingestedDocuments.length === 0 ? (
          <p className="px-3 pb-2 text-xs text-slate-400">No new documents in this interval.</p>
        ) : (
          <ul className="space-y-1 px-3 pb-2">
            {diff.ingestedDocuments.map((doc) => (
              <li key={doc.id} className="flex items-start gap-2 text-xs">
                <FilePlus2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SourceBadge source={doc.source} />
                    <span className="font-mono text-[10px] text-slate-400">
                      {doc.id} · v{doc.version}
                    </span>
                  </div>
                  <div className="mt-0.5 text-slate-700">{doc.title}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {(diff.conflictsOpened.length > 0 || diff.conflictsResolved.length > 0) && (
        <Section title="Conflict movement" count={diff.conflictsOpened.length + diff.conflictsResolved.length}>
          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {diff.conflictsOpened.map((c) => (
              <button
                key={`open-${c.fieldKey}`}
                type="button"
                onClick={() => onFocusField(c.fieldKey)}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset transition hover:brightness-95',
                  c.severity === 'critical' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-800 ring-amber-200',
                )}
              >
                ▲ Opened: {c.label}
              </button>
            ))}
            {diff.conflictsResolved.map((c) => (
              <span
                key={`resolved-${c.fieldKey}`}
                className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200"
              >
                ✓ Resolved: {c.label}
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section title="Field changes" count={changed.length}>
        {changed.length === 0 ? (
          <EmptyState icon={Sparkles} title="No field changes" body="The golden record is identical to the previous point in time." />
        ) : (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">
            {changed.map((change) => (
              <ChangeRow
                key={change.fieldKey}
                change={change}
                focused={focusedField === change.fieldKey}
                onFocus={() => onFocusField(change.fieldKey)}
              />
            ))}
          </ul>
        )}
      </Section>

      {diff.unchanged.length > 0 && (
        <div className="border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowUnchanged((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
          >
            {showUnchanged ? 'Hide' : 'Show'} {diff.unchanged.length} unchanged fields
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showUnchanged && 'rotate-180')} />
          </button>
          {showUnchanged && (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {diff.unchanged.map((change) => (
                <li key={change.fieldKey} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                  <span className="truncate text-slate-500">{change.label}</span>
                  <span className="truncate font-medium text-slate-700">{formatValue(change.currentValue, change.format)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
        <span className="font-mono text-[10px] text-slate-400">{count}</span>
      </div>
      {children}
    </div>
  );
}

function ChangeRow({ change, focused, onFocus }: { change: FieldChange; focused: boolean; onFocus: () => void }) {
  const style = CHANGE_STYLES[change.type];
  const previous = formatValue(change.previousValue, change.format);
  const current = formatValue(change.currentValue, change.format);
  const numericDelta =
    change.type === 'modified' && typeof change.previousValue === 'number' && typeof change.currentValue === 'number'
      ? change.currentValue - change.previousValue
      : null;
  const sourceChanged = change.previousSource !== null && change.currentSource !== null && change.previousSource !== change.currentSource;

  return (
    <li>
      <button
        type="button"
        onClick={onFocus}
        className={cn('w-full px-3 py-2 text-left transition-colors hover:bg-slate-50', focused && 'bg-indigo-50/70 hover:bg-indigo-50')}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-slate-700">{change.label}</span>
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset', style.badge)}>
            {style.label}
          </span>
        </div>

        {change.type === 'modified' && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 line-through decoration-slate-400">{previous}</span>
            <span className="text-yellow-600" aria-hidden>
              ➔
            </span>
            <span className="rounded bg-yellow-50 px-1.5 py-0.5 font-semibold text-yellow-900 ring-1 ring-inset ring-yellow-200">
              {current}
            </span>
            {numericDelta !== null && (
              <span
                className={cn(
                  'font-mono text-[10px] font-semibold tabular-nums',
                  numericDelta > 0 ? 'text-emerald-600' : numericDelta < 0 ? 'text-red-600' : 'text-slate-500',
                )}
              >
                {formatSignedDelta(numericDelta, change.format)}
              </span>
            )}
          </div>
        )}
        {change.type === 'added' && (
          <div className="mt-1 text-xs font-semibold text-emerald-800">{current}</div>
        )}
        {change.type === 'removed' && (
          <div className="mt-1 text-xs text-red-700 line-through decoration-red-300">{previous}</div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
          {sourceChanged && change.previousSource && change.currentSource ? (
            <>
              Winner moved <SourceBadge source={change.previousSource} /> ➔ <SourceBadge source={change.currentSource} />
            </>
          ) : change.currentSource ? (
            <>
              via <SourceBadge source={change.currentSource} />
            </>
          ) : change.previousSource ? (
            <>
              retracted by <SourceBadge source={change.previousSource} />
            </>
          ) : null}
        </div>
      </button>
    </li>
  );
}
