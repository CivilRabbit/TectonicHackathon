import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { AUTHORITY_DOMAINS, DOMAIN_LABELS, SOURCE_LABELS } from '../config/sources';
import { SOURCE_SWATCH } from '../config/ui';
import { cn } from '../lib/cn';
import type { AuthorityDomain, GoldenRecordEntry, RankingImpact, SourceRankMap, SourceSystem } from '../types';
import { DEFAULT_RANKINGS } from '../utils/engine';
import { formatDate, formatValue } from '../utils/format';
import { Modal } from './ui/Modal';
import { SourceTag } from './ui/SourceTag';

interface HierarchyManagerModalProps {
  domain: AuthorityDomain;
  rankings: SourceRankMap;
  baseline: SourceRankMap;
  impact: RankingImpact[];
  goldenRecord: GoldenRecordEntry[];
  lastSynced: Map<SourceSystem, string>;
  onSelectDomain: (domain: AuthorityDomain) => void;
  onMove: (domain: AuthorityDomain, source: SourceSystem, delta: number) => void;
  onUndo: () => void;
  onResetDefaults: () => void;
  onClose: () => void;
}

function primaryDomains(rankings: SourceRankMap, source: SourceSystem): AuthorityDomain[] {
  return AUTHORITY_DOMAINS.filter((d) => rankings[d][0] === source);
}

export function HierarchyManagerModal({
  domain,
  rankings,
  baseline,
  impact,
  goldenRecord,
  lastSynced,
  onSelectDomain,
  onMove,
  onUndo,
  onResetDefaults,
  onClose,
}: HierarchyManagerModalProps) {
  const order = rankings[domain];
  const domainFields = goldenRecord.filter((e) => e.domain === domain);
  const changedSinceOpen = AUTHORITY_DOMAINS.some((d) => rankings[d].join() !== baseline[d].join());
  const isDefault = AUTHORITY_DOMAINS.every((d) => rankings[d].join() === DEFAULT_RANKINGS[d].join());

  return (
    <Modal
      title="Source Authority & Hierarchy Manager"
      onClose={onClose}
      className="h-[min(720px,100%)] max-w-5xl"
      headerActions={
        <button
          type="button"
          onClick={onResetDefaults}
          disabled={isDefault}
          className="text-[11px] text-zinc-400 hover:text-zinc-100 disabled:cursor-default disabled:text-zinc-700"
        >
          Reset to Defaults
        </button>
      }
    >
      <p className="shrink-0 border-b border-zinc-800 px-4 py-2.5 text-xs leading-relaxed text-zinc-400">
        When sources report different values for a field, the source ranked highest in that field&apos;s domain wins.
        Manual overrides and resolved conflicts take precedence over the hierarchy.
      </p>

      <nav className="flex shrink-0 gap-px overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-2" role="tablist">
        {AUTHORITY_DOMAINS.map((d) => {
          const customized = rankings[d].join() !== DEFAULT_RANKINGS[d].join();
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === domain}
              onClick={() => onSelectDomain(d)}
              className={cn(
                'relative -mb-px shrink-0 border-b-2 px-3 py-2 text-[11px] transition',
                d === domain ? 'border-zinc-100 text-zinc-50' : 'border-transparent text-zinc-500 hover:text-zinc-300',
              )}
            >
              {DOMAIN_LABELS[d]}
              {customized && <span className="ml-1.5 inline-block h-1 w-1 translate-y-[-2px] rounded-full bg-sky-400" />}
            </button>
          );
        })}
      </nav>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] divide-x divide-zinc-800">
        <ol className="scroll-thin min-h-0 overflow-y-auto">
          {order.map((source, index) => {
            const primaries = primaryDomains(rankings, source);
            const synced = lastSynced.get(source);
            const movedFrom = baseline[domain].indexOf(source);
            return (
              <li
                key={source}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_7rem_auto] items-center gap-4 border-b border-zinc-800 px-4 py-3"
              >
                <span
                  className={cn(
                    'grid h-7 w-8 place-items-center rounded-sm border font-mono text-xs',
                    index === 0 ? 'border-zinc-300 text-zinc-50' : 'border-zinc-700 text-zinc-400',
                  )}
                >
                  #{index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-[1px]', SOURCE_SWATCH[source])} />
                    <span className="text-sm font-medium text-zinc-100">{SOURCE_LABELS[source]}</span>
                    {movedFrom !== index && (
                      <span className="font-mono text-[10px] text-sky-400">
                        {movedFrom > index ? '▲' : '▼'} from #{movedFrom + 1}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                    {primaries.length > 0
                      ? `Primary for ${primaries.map((d) => DOMAIN_LABELS[d]).join(' & ')}`
                      : 'No primary domain'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-600">Last synced</div>
                  <div className="font-mono text-[11px] text-zinc-300">{synced ? formatDate(synced) : '—'}</div>
                </div>
                <div className="flex gap-1">
                  <ReorderButton
                    label={`Move ${SOURCE_LABELS[source]} up`}
                    disabled={index === 0}
                    onClick={() => onMove(domain, source, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </ReorderButton>
                  <ReorderButton
                    label={`Move ${SOURCE_LABELS[source]} down`}
                    disabled={index === order.length - 1}
                    onClick={() => onMove(domain, source, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </ReorderButton>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="scroll-thin flex min-h-0 flex-col overflow-y-auto">
          <section className="border-b border-zinc-800">
            <div className="flex h-9 items-center justify-between px-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                Live impact <span className="font-mono text-zinc-600">{impact.length}</span>
              </h3>
              {changedSinceOpen && (
                <button type="button" onClick={onUndo} className="font-mono text-[10px] uppercase text-zinc-400 hover:text-zinc-100">
                  Undo changes
                </button>
              )}
            </div>
            {impact.length === 0 ? (
              <p className="px-4 pb-3 font-mono text-[11px] text-zinc-600">No Golden Record values change.</p>
            ) : (
              <ul className="pb-2">
                {impact.map((change) => (
                  <li key={change.fieldKey} className="px-4 py-1.5">
                    <div className="font-mono text-[10px] text-zinc-400">{change.code}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-zinc-500 line-through decoration-zinc-600">
                        {formatValue(change.previousValue, change.format)}
                      </span>
                      <SourceTag source={change.previousSource} className="text-zinc-500" />
                      <span className="text-yellow-500">➔</span>
                      <span className="text-yellow-100">{formatValue(change.nextValue, change.format)}</span>
                      <SourceTag source={change.nextSource} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="flex h-9 items-center px-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              {DOMAIN_LABELS[domain]} fields <span className="ml-1.5 font-mono text-zinc-600">{domainFields.length}</span>
            </h3>
            {domainFields.length === 0 ? (
              <p className="px-4 pb-3 font-mono text-[11px] text-zinc-600">No fields at this point in time.</p>
            ) : (
              <ul>
                {domainFields.map((entry) => (
                  <li key={entry.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-zinc-800/60 px-4 py-1.5">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] text-zinc-500">{entry.label}</div>
                      <div className="truncate text-xs text-zinc-100">{formatValue(entry.value, entry.format)}</div>
                    </div>
                    <SourceTag source={entry.source} rank={entry.rank} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Modal>
  );
}

function ReorderButton({
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
      className="grid h-7 w-7 place-items-center rounded-sm border border-zinc-700 text-zinc-300 transition hover:border-zinc-400 hover:text-white disabled:border-zinc-800 disabled:text-zinc-700"
    >
      {children}
    </button>
  );
}
