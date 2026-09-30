import type { ReactNode } from 'react';
import { healthTextClass } from '../config/ui';
import { cn } from '../lib/cn';
import type { ClientProfile, ClientSnapshot } from '../types';
import { formatDateTime } from '../utils/format';

interface HeaderBarProps {
  profile: ClientProfile;
  snapshot: ClientSnapshot;
  totalDocuments: number;
  isLatest: boolean;
  customizationCount: number;
  onJumpToLatest: () => void;
  onResetDefaults: () => void;
}

export function HeaderBar({
  profile,
  snapshot,
  totalDocuments,
  isLatest,
  customizationCount,
  onJumpToLatest,
  onResetDefaults,
}: HeaderBarProps) {
  const { health } = snapshot;
  const open = health.criticalCount + health.warningCount;

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex h-12 max-w-[1600px] items-center gap-6 px-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="text-sm font-semibold tracking-tight text-zinc-50">{profile.name}</h1>
          <span className="font-mono text-xs text-zinc-500">{profile.displayId}</span>
          <span className="hidden truncate text-xs text-zinc-500 lg:inline">
            {profile.legalEntity} · {profile.workLocation}
          </span>
        </div>

        <div className="flex items-baseline gap-2 border-l border-zinc-800 pl-6">
          <span className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">As of</span>
          <span className="font-mono text-xs text-zinc-100">{formatDateTime(snapshot.asOf)}</span>
          {!isLatest && (
            <button
              type="button"
              onClick={onJumpToLatest}
              className="font-mono text-[10px] uppercase text-amber-400 underline-offset-2 hover:underline"
            >
              History · return to latest
            </button>
          )}
        </div>

        <dl className="ml-auto flex items-baseline gap-5">
          <Metric label="Docs">
            {snapshot.documents.length}
            <span className="text-zinc-600">/{totalDocuments}</span>
          </Metric>
          <Metric label="Open conflicts">
            <span className={cn(health.criticalCount > 0 ? 'text-red-400' : open > 0 ? 'text-amber-400' : 'text-zinc-100')}>
              {open}
            </span>
            {health.criticalCount > 0 && <span className="text-red-400/70"> ({health.criticalCount} crit)</span>}
            {health.overriddenCount > 0 && <span className="text-sky-400/80"> +{health.overriddenCount} manual</span>}
          </Metric>
          <Metric label="Health">
            <span
              className={healthTextClass(health.score)}
              title={`−${health.conflictPenalty} open conflicts · −${health.stalenessPenalty} stale fields (${health.staleFields})`}
            >
              {health.score}
            </span>
          </Metric>
        </dl>

        <button
          type="button"
          onClick={onResetDefaults}
          disabled={customizationCount === 0}
          className="border-l border-zinc-800 pl-5 text-[11px] text-zinc-400 transition hover:text-zinc-100 disabled:cursor-default disabled:text-zinc-700"
        >
          Reset to Defaults{customizationCount > 0 && <span className="font-mono text-zinc-500"> ({customizationCount})</span>}
        </button>
      </div>
    </header>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">{label}</dt>
      <dd className="font-mono text-xs text-zinc-100">{children}</dd>
    </div>
  );
}
