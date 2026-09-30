import { ChevronLeft, ChevronRight, Pause, Play, SkipForward } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ORIGIN_ICONS, ORIGIN_LABELS } from '../config/origins';
import { cn } from '../lib/cn';
import type { TimelinePoint } from '../types';
import { formatDate, formatShortDate } from '../utils/format';
import { SourceTag } from './ui/SourceTag';

interface TimelineScrubberProps {
  points: TimelinePoint[];
  activeIndex: number;
  isPlaying: boolean;
  onSelect: (index: number) => void;
  onStep: (delta: number) => void;
  onTogglePlay: () => void;
  /** Document ids that participate in a conflict at the selected point in time. */
  conflictDocumentIds: ReadonlySet<string>;
  /** Docked beneath the track, e.g. the change feed. */
  footer?: ReactNode;
}

const TRACK_Y = 34;

export function TimelineScrubber({
  points,
  activeIndex,
  isPlaying,
  onSelect,
  onStep,
  onTogglePlay,
  conflictDocumentIds,
  footer,
}: TimelineScrubberProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const lastIndex = points.length - 1;
  const position = (index: number) => (lastIndex === 0 ? 50 : (index / lastIndex) * 100);
  const inspected = points[hoverIndex ?? activeIndex];

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900">
      <div className="flex h-9 items-center gap-3 border-b border-zinc-800 px-3">
        <h2 className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-200">Timeline</h2>

        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden font-mono text-[10px] text-zinc-400">
          <span className={cn('shrink-0', hoverIndex !== null && hoverIndex !== activeIndex ? 'text-zinc-500' : 'text-zinc-200')}>
            {formatDate(inspected.asOf)}
            {inspected.milestone && <span className="text-zinc-500"> · {inspected.milestone}</span>}
          </span>
          {inspected.documents.map((doc) => {
            const Icon = ORIGIN_ICONS[doc.origin.kind];
            return (
            <span key={doc.id} className="flex min-w-0 items-center gap-1.5">
              <Icon
                className={cn('h-3.5 w-3.5 shrink-0', conflictDocumentIds.has(doc.id) ? 'text-red-400' : 'text-white')}
                aria-hidden
              />
              <SourceTag source={doc.source} />
              <span className="truncate font-sans text-[11px] text-zinc-400">{doc.title}</span>
              <span className="shrink-0 text-zinc-600">v{doc.version}</span>
            </span>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center">
          <ControlButton label="Previous (←)" onClick={() => onStep(-1)} disabled={activeIndex === 0}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton label={isPlaying ? 'Pause' : 'Replay'} onClick={onTogglePlay} active={isPlaying}>
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </ControlButton>
          <ControlButton label="Next (→)" onClick={() => onStep(1)} disabled={activeIndex === lastIndex}>
            <ChevronRight className="h-3.5 w-3.5" />
          </ControlButton>
          <ControlButton label="Latest (End)" onClick={() => onSelect(lastIndex)} disabled={activeIndex === lastIndex}>
            <SkipForward className="h-3.5 w-3.5" />
          </ControlButton>
        </div>
      </div>

      <div className="scroll-thin overflow-x-auto">
        <div className="min-w-[980px] px-10" onMouseLeave={() => setHoverIndex(null)}>
          <div className="relative h-[92px]">
            <div className="absolute inset-x-0 h-px bg-zinc-700" style={{ top: TRACK_Y }} />
            <div
              className="absolute left-0 h-px bg-zinc-200 transition-[width] duration-300 ease-out"
              style={{ top: TRACK_Y, width: `${position(activeIndex)}%` }}
            />

            {points.map((point, index) => {
              const isActive = index === activeIndex;
              const isPast = index <= activeIndex;
              const isMilestone = point.milestone !== null;
              const lead = point.documents[0];
              const LeadIcon = lead ? ORIGIN_ICONS[lead.origin.kind] : null;
              const inConflict = lead ? conflictDocumentIds.has(lead.id) : false;

              return (
                <div key={point.id} className="absolute top-0 -translate-x-1/2" style={{ left: `${position(index)}%` }}>
                  {isMilestone && (
                    <span
                      className={cn(
                        'absolute left-1/2 top-[6px] -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase',
                        isActive ? 'text-zinc-50' : 'text-zinc-500',
                      )}
                    >
                      {point.milestone}
                    </span>
                  )}
                  {isMilestone && (
                    <span className="absolute left-1/2 top-[22px] h-6 w-px -translate-x-1/2 bg-zinc-700" />
                  )}

                  <button
                    type="button"
                    onClick={() => onSelect(index)}
                    onMouseEnter={() => setHoverIndex(index)}
                    onFocus={() => setHoverIndex(index)}
                    onBlur={() => setHoverIndex(null)}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={
                      lead
                        ? `${formatDate(point.asOf)}${isMilestone ? ` (${point.milestone})` : ''}: ${ORIGIN_LABELS[lead.origin.kind]}, ${lead.title}`
                        : `${formatDate(point.asOf)}${isMilestone ? ` (${point.milestone})` : ''}: checkpoint`
                    }
                    className="group absolute left-1/2 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                    style={{ top: TRACK_Y }}
                  >
                    {LeadIcon ? (
                      <LeadIcon
                        aria-hidden
                        className={cn(
                          'transition-transform duration-150 group-hover:scale-125',
                          isActive ? 'h-4 w-4' : 'h-3.5 w-3.5',
                          inConflict ? 'text-red-400' : 'text-white',
                        )}
                      />
                    ) : (
                      <span
                        className={cn(
                          'block h-1.5 w-1.5 rounded-full',
                          isActive ? 'bg-zinc-50 outline outline-1 outline-offset-2 outline-zinc-50' : 'bg-zinc-600',
                        )}
                      />
                    )}
                  </button>

                  <span
                    className={cn(
                      'pointer-events-none absolute left-1/2 top-[52px] -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tabular-nums',
                      isActive ? 'text-zinc-50' : isPast ? 'text-zinc-500' : 'text-zinc-600',
                    )}
                  >
                    {formatShortDate(point.asOf)}
                  </span>
                  {point.documents.length > 1 && (
                    <span className="pointer-events-none absolute left-1/2 top-[68px] -translate-x-1/2 font-mono text-[9px] text-zinc-600">
                      ×{point.documents.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {footer}
    </section>
  );
}

interface ControlButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
}

function ControlButton({ label, onClick, disabled, active, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid h-7 w-7 place-items-center rounded-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent',
        active && 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 hover:text-zinc-900',
      )}
    >
      {children}
    </button>
  );
}
