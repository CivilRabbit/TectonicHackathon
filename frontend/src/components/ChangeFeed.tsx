import { CHANGE_STYLES } from '../config/ui';
import { cn } from '../lib/cn';
import type { FieldChange, SnapshotDiff } from '../types';
import { formatShortDate, formatValue } from '../utils/format';

interface ChangeFeedProps {
  diff: SnapshotDiff;
  focusedField: string | null;
  onFocusField: (key: string) => void;
}

const INLINE_VALUE_MAX = 16;

function describe(change: FieldChange): string {
  const previous = formatValue(change.previousValue, change.format);
  const current = formatValue(change.currentValue, change.format);
  switch (change.type) {
    case 'added':
      return current.length <= INLINE_VALUE_MAX ? current : 'Added';
    case 'removed':
      return 'Removed';
    default:
      return previous.length <= INLINE_VALUE_MAX && current.length <= INLINE_VALUE_MAX
        ? `${previous} ➔ ${current}`
        : 'Updated';
  }
}

export function ChangeFeed({ diff, focusedField, onFocusField }: ChangeFeedProps) {
  const changes = [...diff.modified, ...diff.added, ...diff.removed];
  const conflictEvents = [
    ...diff.conflictsOpened.map((c) => ({ ...c, kind: 'opened' as const })),
    ...diff.conflictsResolved.map((c) => ({ ...c, kind: 'resolved' as const })),
  ];

  return (
    <div className="flex h-9 items-center gap-3 border-t border-zinc-800 px-3">
      <span className="shrink-0 font-mono text-[10px] uppercase text-zinc-500">
        {diff.fromDate ? `Δ ${formatShortDate(diff.fromDate)}` : 'Δ initial'}
        <span className="text-zinc-600"> · {diff.ingestedDocuments.length} doc</span>
      </span>

      <div className="scroll-none flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {changes.length === 0 && conflictEvents.length === 0 && (
          <span className="font-mono text-[10px] text-zinc-600">No changes</span>
        )}

        {conflictEvents.map((event) => (
          <button
            key={`${event.kind}-${event.fieldKey}`}
            type="button"
            onClick={() => onFocusField(event.fieldKey)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[10px] transition hover:bg-zinc-800',
              event.kind === 'resolved' ? 'border-emerald-500/40 text-emerald-300' : 'border-red-500/50 text-red-300',
              focusedField === event.fieldKey && 'bg-zinc-800 ring-1 ring-zinc-500',
            )}
          >
            {event.code}: {event.kind === 'resolved' ? 'conflict cleared' : 'conflict'}
          </button>
        ))}

        {changes.map((change) => {
          const style = CHANGE_STYLES[change.type as keyof typeof CHANGE_STYLES];
          return (
            <button
              key={change.fieldKey}
              type="button"
              title={change.label}
              onClick={() => onFocusField(change.fieldKey)}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[10px] transition hover:bg-zinc-800',
                style.pill,
                focusedField === change.fieldKey && 'bg-zinc-800 ring-1 ring-zinc-500',
              )}
            >
              {style.prefix}
              {change.code}: <span className="text-zinc-100">{describe(change)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
