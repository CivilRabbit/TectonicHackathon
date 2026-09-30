import { AlertOctagon, AlertTriangle, Database, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATEGORY_META, CATEGORY_ORDER, CHANGE_STYLES, SEVERITY_STYLES } from '../config/ui';
import { cn } from '../lib/cn';
import type { ConflictSeverity, DiffChangeType, GoldenRecordEntry } from '../types';
import { formatValue } from '../utils/format';
import { FreshnessBadge } from './ui/FreshnessBadge';
import { EmptyState, Panel } from './ui/Panel';
import { SourceBadge } from './ui/SourceBadge';

interface GoldenRecordPanelProps {
  entries: GoldenRecordEntry[];
  conflictSeverityByKey: Map<string, ConflictSeverity>;
  changeTypeByKey: Map<string, DiffChangeType>;
  focusedField: string | null;
  onFocusField: (key: string) => void;
  className?: string;
}

export function GoldenRecordPanel({
  entries,
  conflictSeverityByKey,
  changeTypeByKey,
  focusedField,
  onFocusField,
  className,
}: GoldenRecordPanelProps) {
  const [query, setQuery] = useState('');
  const sourceCount = useMemo(() => new Set(entries.flatMap((e) => e.contributingSources)).size, [entries]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? entries.filter(
          (e) => e.label.toLowerCase().includes(needle) || formatValue(e.value, e.format).toLowerCase().includes(needle),
        )
      : entries;
    return CATEGORY_ORDER.map((category) => ({ category, items: matches.filter((e) => e.category === category) })).filter(
      (group) => group.items.length > 0,
    );
  }, [entries, query]);

  return (
    <Panel
      title="Customer 360 · Golden record"
      icon={Database}
      className={className}
      meta={
        <span className="whitespace-nowrap text-[11px] text-slate-500">
          {entries.length} fields · {sourceCount} sources
        </span>
      }
      toolbar={
        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter fields or values…"
            className="h-7 w-full rounded-md border border-slate-200 bg-white pl-7 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => setQuery('')}
              className="absolute right-1.5 grid h-4 w-4 place-items-center rounded text-slate-400 hover:text-slate-700"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </label>
      }
    >
      {groups.length === 0 ? (
        <EmptyState icon={Search} title="No matching fields" body="Try a different field name or value." />
      ) : (
        groups.map(({ category, items }) => {
          const { label, icon: CategoryIcon } = CATEGORY_META[category];
          return (
            <div key={category}>
              <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-slate-100 bg-white/95 px-3 py-1.5 backdrop-blur">
                <CategoryIcon className="h-3.5 w-3.5 text-slate-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</h3>
                <span className="text-[10px] text-slate-400">{items.length}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {items.map((entry) => (
                  <GoldenRow
                    key={entry.key}
                    entry={entry}
                    severity={conflictSeverityByKey.get(entry.key)}
                    change={changeTypeByKey.get(entry.key)}
                    focused={focusedField === entry.key}
                    onFocus={() => onFocusField(entry.key)}
                  />
                ))}
              </ul>
            </div>
          );
        })
      )}
    </Panel>
  );
}

interface GoldenRowProps {
  entry: GoldenRecordEntry;
  severity?: ConflictSeverity;
  change?: DiffChangeType;
  focused: boolean;
  onFocus: () => void;
}

function GoldenRow({ entry, severity, change, focused, onFocus }: GoldenRowProps) {
  const formatted = formatValue(entry.value, entry.format);
  const SeverityIcon = severity === 'critical' ? AlertOctagon : AlertTriangle;

  return (
    <li>
      <button
        type="button"
        onClick={onFocus}
        className={cn(
          'grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-l-2 border-l-transparent px-3 py-2 text-left transition-colors hover:bg-slate-50',
          severity && SEVERITY_STYLES[severity].accentBorder,
          focused && 'bg-indigo-50/70 hover:bg-indigo-50',
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="truncate">{entry.label}</span>
            {severity && (
              <SeverityIcon
                className={cn('h-3 w-3 shrink-0', SEVERITY_STYLES[severity].text)}
                aria-label={`${SEVERITY_STYLES[severity].label} conflict`}
              />
            )}
            {change && change !== 'unchanged' && (
              <span
                title={`${CHANGE_STYLES[change].label} since previous point`}
                className={cn('h-1.5 w-1.5 shrink-0 rounded-full', CHANGE_STYLES[change].dot)}
              />
            )}
          </div>
          <div
            title={formatted}
            className={cn(
              'mt-0.5 truncate text-sm font-medium text-slate-900',
              (entry.format === 'number' || entry.format === 'currency') && 'font-mono tabular-nums',
            )}
          >
            {formatted}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <SourceBadge source={entry.source} priority={entry.priority} />
          <FreshnessBadge days={entry.freshnessDays} />
        </div>
      </button>
    </li>
  );
}
