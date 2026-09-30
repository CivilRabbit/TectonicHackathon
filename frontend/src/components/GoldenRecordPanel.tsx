import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../config/ui';
import { cn } from '../lib/cn';
import type { AuthorityDomain, GoldenRecordEntry } from '../types';
import { STALE_AFTER_DAYS } from '../utils/engine';
import { formatAge, formatValue } from '../utils/format';
import { OverrideBadge, ResolvedBadge } from './ui/OverrideBadge';
import { EmptyState, Panel } from './ui/Panel';
import { SourceTag } from './ui/SourceTag';

interface GoldenRecordPanelProps {
  entries: GoldenRecordEntry[];
  focusedField: string | null;
  onFocusField: (key: string) => void;
  onOpenHierarchy: (domain: AuthorityDomain) => void;
  className?: string;
}

export function GoldenRecordPanel({
  entries,
  focusedField,
  onFocusField,
  onOpenHierarchy,
  className,
}: GoldenRecordPanelProps) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? entries.filter(
          (e) =>
            e.label.toLowerCase().includes(needle) ||
            e.code.toLowerCase().includes(needle) ||
            formatValue(e.value, e.format).toLowerCase().includes(needle),
        )
      : entries;
    return CATEGORY_ORDER.map((category) => ({ category, items: matches.filter((e) => e.category === category) })).filter(
      (group) => group.items.length > 0,
    );
  }, [entries, query]);

  useEffect(() => {
    if (!focusedField) return;
    document.getElementById(`golden-row-${focusedField}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusedField]);

  return (
    <Panel
      title="Golden Record"
      className={className}
      meta={<span className="font-mono text-[10px] text-zinc-500">{entries.length}</span>}
      actions={
        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-1.5 h-3 w-3 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter"
            className="h-6 w-40 rounded-sm border border-zinc-800 bg-zinc-950 pl-6 pr-6 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => setQuery('')}
              className="absolute right-1 grid h-4 w-4 place-items-center text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </label>
      }
    >
      {groups.length === 0 ? (
        <EmptyState title="No matching fields" />
      ) : (
        groups.map(({ category, items }) => (
          <div key={category}>
            <h3 className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              {CATEGORY_LABELS[category]}
            </h3>
            <ul>
              {items.map((entry) => (
                <GoldenRow
                  key={entry.key}
                  entry={entry}
                  inConflict={entry.hasConflict && !entry.isResolved}
                  focused={focusedField === entry.key}
                  onFocus={() => onFocusField(entry.key)}
                  onOpenHierarchy={() => onOpenHierarchy(entry.domain)}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </Panel>
  );
}

interface GoldenRowProps {
  entry: GoldenRecordEntry;
  inConflict: boolean;
  focused: boolean;
  onFocus: () => void;
  onOpenHierarchy: () => void;
}

function GoldenRow({ entry, inConflict, focused, onFocus, onOpenHierarchy }: GoldenRowProps) {
  const formatted = formatValue(entry.value, entry.format);
  const stale = entry.freshnessDays > STALE_AFTER_DAYS;

  return (
    <li
      id={`golden-row-${entry.key}`}
      className={cn(
        'grid scroll-m-8 grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto_2.75rem] items-center gap-3 border-b border-l-2 border-b-zinc-800/70 border-l-transparent px-3 py-[7px] transition-colors hover:bg-zinc-800/50',
        inConflict && 'border-l-red-500',
        focused && 'bg-zinc-800/70 hover:bg-zinc-800/70',
      )}
    >
      <button type="button" onClick={onFocus} className="truncate text-left text-xs text-zinc-500 hover:text-zinc-300" title={entry.label}>
        {entry.label}
      </button>
      <button
        type="button"
        onClick={onFocus}
        title={formatted}
        className={cn(
          'truncate text-left text-[13px] text-zinc-100',
          (entry.format === 'number' || entry.format === 'currency' || entry.format === 'date') && 'font-mono text-xs tabular-nums',
        )}
      >
        {formatted}
      </button>
      <span className="flex items-center gap-2">
        {entry.isResolved ? <ResolvedBadge /> : entry.isOverridden && <OverrideBadge />}
        <button
          type="button"
          onClick={onOpenHierarchy}
          title="Manage source hierarchy"
          className="rounded-sm border border-transparent px-1 py-0.5 transition hover:border-zinc-600 hover:bg-zinc-950"
        >
          <SourceTag source={entry.source} rank={entry.rank} />
        </button>
      </span>
      <span
        title={stale ? `Stale: older than ${STALE_AFTER_DAYS} days` : `${entry.freshnessDays} days old`}
        className={cn('text-right font-mono text-[10px] tabular-nums', stale ? 'text-amber-400/80' : 'text-zinc-500')}
      >
        {formatAge(entry.freshnessDays)}
      </span>
    </li>
  );
}
