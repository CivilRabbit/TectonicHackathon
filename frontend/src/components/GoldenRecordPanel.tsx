import { ArrowDown, ArrowUp, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DOMAIN_LABELS } from '../config/sources';
import { CATEGORY_LABELS, CATEGORY_ORDER, SEVERITY_STYLES, SOURCE_SWATCH } from '../config/ui';
import { cn } from '../lib/cn';
import type { AuthorityDomain, ConflictSeverity, GoldenRecordEntry, SourceRankMap, SourceSystem } from '../types';
import { STALE_AFTER_DAYS } from '../utils/engine';
import { formatAge, formatValue } from '../utils/format';
import { OverrideBadge } from './ui/OverrideBadge';
import { EmptyState, Panel } from './ui/Panel';
import { SourceTag } from './ui/SourceTag';

interface GoldenRecordPanelProps {
  entries: GoldenRecordEntry[];
  rankings: SourceRankMap;
  conflictSeverityByKey: Map<string, ConflictSeverity>;
  focusedField: string | null;
  onFocusField: (key: string) => void;
  onMoveRank: (domain: AuthorityDomain, source: SourceSystem, delta: number) => void;
  onClearOverride: (fieldKey: string) => void;
  className?: string;
}

export function GoldenRecordPanel({
  entries,
  rankings,
  conflictSeverityByKey,
  focusedField,
  onFocusField,
  onMoveRank,
  onClearOverride,
  className,
}: GoldenRecordPanelProps) {
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const domainFieldCounts = useMemo(() => {
    const counts = new Map<AuthorityDomain, number>();
    for (const entry of entries) counts.set(entry.domain, (counts.get(entry.domain) ?? 0) + 1);
    return counts;
  }, [entries]);

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

  useEffect(() => {
    if (openKey && !entries.some((e) => e.key === openKey)) setOpenKey(null);
  }, [entries, openKey]);

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
                  ranking={rankings[entry.domain]}
                  domainFieldCount={domainFieldCounts.get(entry.domain) ?? 1}
                  severity={conflictSeverityByKey.get(entry.key)}
                  focused={focusedField === entry.key}
                  open={openKey === entry.key}
                  onToggle={() => {
                    setOpenKey((current) => (current === entry.key ? null : entry.key));
                    onFocusField(entry.key);
                  }}
                  onClose={() => setOpenKey(null)}
                  onMoveRank={(source, delta) => onMoveRank(entry.domain, source, delta)}
                  onClearOverride={() => onClearOverride(entry.key)}
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
  ranking: SourceSystem[];
  domainFieldCount: number;
  severity?: ConflictSeverity;
  focused: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMoveRank: (source: SourceSystem, delta: number) => void;
  onClearOverride: () => void;
}

function GoldenRow({
  entry,
  ranking,
  domainFieldCount,
  severity,
  focused,
  open,
  onToggle,
  onClose,
  onMoveRank,
  onClearOverride,
}: GoldenRowProps) {
  const containerRef = useRef<HTMLLIElement>(null);
  const formatted = formatValue(entry.value, entry.format);
  const stale = entry.freshnessDays > STALE_AFTER_DAYS;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <li ref={containerRef} id={`golden-row-${entry.key}`} className="scroll-m-8 border-b border-zinc-800/70">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'grid w-full grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto_2.75rem] items-center gap-3 border-l-2 border-l-transparent px-3 py-[7px] text-left transition-colors hover:bg-zinc-800/50',
          severity && SEVERITY_STYLES[severity].edge,
          (focused || open) && 'bg-zinc-800/70 hover:bg-zinc-800/70',
        )}
      >
        <span className="truncate text-xs text-zinc-500" title={entry.label}>
          {entry.label}
        </span>
        <span
          title={formatted}
          className={cn(
            'truncate text-[13px] text-zinc-100',
            (entry.format === 'number' || entry.format === 'currency' || entry.format === 'date') && 'font-mono text-xs tabular-nums',
          )}
        >
          {formatted}
        </span>
        <span className="flex items-center gap-2">
          {entry.isOverridden && <OverrideBadge />}
          <SourceTag source={entry.source} rank={entry.rank} />
        </span>
        <span
          title={stale ? `Stale: older than ${STALE_AFTER_DAYS} days` : `${entry.freshnessDays} days old`}
          className={cn('text-right font-mono text-[10px] tabular-nums', stale ? 'text-amber-400/80' : 'text-zinc-500')}
        >
          {formatAge(entry.freshnessDays)}
        </span>
      </button>

      {open && (
        <RankPopover
          entry={entry}
          ranking={ranking}
          domainFieldCount={domainFieldCount}
          onMoveRank={onMoveRank}
          onClearOverride={onClearOverride}
        />
      )}
    </li>
  );
}

interface RankPopoverProps {
  entry: GoldenRecordEntry;
  ranking: SourceSystem[];
  domainFieldCount: number;
  onMoveRank: (source: SourceSystem, delta: number) => void;
  onClearOverride: () => void;
}

function RankPopover({ entry, ranking, domainFieldCount, onMoveRank, onClearOverride }: RankPopoverProps) {
  const claimsBySource = new Map(entry.claims.map((c) => [c.source, c]));

  return (
    <div className="mx-3 mb-2 mt-0.5 rounded-sm border border-zinc-700 bg-zinc-950 shadow-lg shadow-black/40">
      <div className="flex items-baseline justify-between border-b border-zinc-800 px-2.5 py-1.5">
        <span className="font-mono text-[10px] uppercase text-zinc-400">
          Authority · {DOMAIN_LABELS[entry.domain]}
        </span>
        <span className="font-mono text-[10px] text-zinc-600">
          applies to {domainFieldCount} field{domainFieldCount === 1 ? '' : 's'}
        </span>
      </div>

      {entry.isOverridden && (
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-400">
          <span className="flex items-center gap-2">
            <OverrideBadge />
            Winner pinned to {entry.source}; ranking does not apply.
          </span>
          <button type="button" onClick={onClearOverride} className="font-mono text-[10px] uppercase text-zinc-300 hover:text-white">
            Clear
          </button>
        </div>
      )}

      <ol>
        {ranking.map((source, index) => {
          const claim = claimsBySource.get(source);
          const isWinner = source === entry.source;
          return (
            <li
              key={source}
              className={cn(
                'grid grid-cols-[2rem_6.5rem_minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-1',
                isWinner && 'bg-zinc-800/80',
              )}
            >
              <span className="font-mono text-[10px] text-zinc-500">#{index + 1}</span>
              <span className={cn('flex items-center gap-1.5 font-mono text-[10px]', claim ? 'text-zinc-200' : 'text-zinc-600')}>
                <span className={cn('h-1.5 w-1.5 rounded-[1px]', SOURCE_SWATCH[source], !claim && 'opacity-30')} />
                {source}
              </span>
              <span className={cn('truncate text-[11px]', claim ? 'text-zinc-300' : 'text-zinc-700')}>
                {claim ? formatValue(claim.value, entry.format) : 'no claim'}
                {isWinner && <span className="ml-2 font-mono text-[10px] text-zinc-500">← wins</span>}
              </span>
              <span className="flex">
                <RankButton label={`Move ${source} up`} disabled={index === 0} onClick={() => onMoveRank(source, -1)}>
                  <ArrowUp className="h-3 w-3" />
                </RankButton>
                <RankButton
                  label={`Move ${source} down`}
                  disabled={index === ranking.length - 1}
                  onClick={() => onMoveRank(source, 1)}
                >
                  <ArrowDown className="h-3 w-3" />
                </RankButton>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RankButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-5 w-5 place-items-center rounded-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-20 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
