import { AlertTriangle, Clock3, FileStack, History, Radio, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { healthTone } from '../config/ui';
import { cn } from '../lib/cn';
import type { ClientProfile, ClientSnapshot } from '../types';
import { formatDateTime } from '../utils/format';
import { HealthRing } from './ui/HealthRing';

interface HeaderBarProps {
  profile: ClientProfile;
  snapshot: ClientSnapshot;
  totalDocuments: number;
  isLatest: boolean;
  onJumpToLatest: () => void;
}

export function HeaderBar({ profile, snapshot, totalDocuments, isLatest, onJumpToLatest }: HeaderBarProps) {
  const { health } = snapshot;
  const conflictTone = health.criticalCount > 0 ? 'critical' : health.warningCount > 0 ? 'warning' : 'ok';
  const tone = healthTone(health.score);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white shadow-lg shadow-slate-900/10">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold tracking-tight">
            AC
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold">{profile.name}</h1>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-300 ring-1 ring-inset ring-slate-700">
                Client {profile.displayId}
              </span>
            </div>
            <p className="truncate text-xs text-slate-400">
              {profile.legalEntity} · {profile.segment} · Work location {profile.workLocation}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border px-3 py-1.5',
            isLatest ? 'border-slate-700 bg-slate-800/60' : 'border-amber-500/40 bg-amber-500/10',
          )}
        >
          <Clock3 className={cn('h-4 w-4', isLatest ? 'text-indigo-300' : 'text-amber-300')} />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Simulated as-of</div>
            <div className="font-mono text-sm tabular-nums">{formatDateTime(snapshot.asOf)}</div>
          </div>
          {isLatest ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <Radio className="h-3 w-3" /> Latest
            </span>
          ) : (
            <button
              type="button"
              onClick={onJumpToLatest}
              className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-400/30"
            >
              <History className="h-3 w-3" /> History mode · back to today
            </button>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Stat icon={FileStack} label="Sources" value={snapshot.documents.length} hint={`of ${totalDocuments} ingested`} />
          <Stat
            icon={AlertTriangle}
            label="Active conflicts"
            value={snapshot.conflicts.length}
            hint={`${health.criticalCount} critical · ${health.warningCount} warning`}
            tone={conflictTone}
          />
          <div
            className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5"
            title={`Conflict penalty −${health.conflictPenalty} · staleness penalty −${health.stalenessPenalty} (${health.staleFields} stale fields)`}
          >
            <HealthRing score={health.score} size={36} />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Data health</div>
              <div className="text-sm font-semibold">
                {health.score}% <span className={cn('text-xs font-medium', tone.text)}>{tone.label}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

interface StatProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint: string;
  tone?: 'ok' | 'warning' | 'critical';
}

function Stat({ icon: Icon, label, value, hint, tone }: StatProps) {
  const toneClass =
    tone === 'critical' ? 'text-red-300' : tone === 'warning' ? 'text-amber-300' : tone === 'ok' ? 'text-emerald-300' : 'text-indigo-300';

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5">
      <Icon className={cn('h-4 w-4', toneClass)} />
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
        <div className="flex items-baseline gap-1.5">
          <span className={cn('font-mono text-sm font-semibold tabular-nums', tone && toneClass)}>{value}</span>
          <span className="text-[10px] text-slate-400">{hint}</span>
        </div>
      </div>
    </div>
  );
}
