import { ChevronLeft, ChevronRight, Flag, History, Pause, Play, SkipForward } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { SOURCE_LABELS, SOURCE_ORDER } from '../config/sources';
import { SOURCE_STYLES } from '../config/ui';
import { cn } from '../lib/cn';
import type { TimelinePoint } from '../types';
import { formatDate, formatShortDate } from '../utils/format';
import { SourceBadge } from './ui/SourceBadge';

interface TimelineScrubberProps {
  points: TimelinePoint[];
  activeIndex: number;
  isPlaying: boolean;
  onSelect: (index: number) => void;
  onStep: (delta: number) => void;
  onTogglePlay: () => void;
}

const TRACK_CENTER_PX = 30;

export function TimelineScrubber({ points, activeIndex, isPlaying, onSelect, onStep, onTogglePlay }: TimelineScrubberProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const lastIndex = points.length - 1;
  const position = (index: number) => (lastIndex === 0 ? 50 : (index / lastIndex) * 100);
  const inspectedIndex = hoverIndex ?? activeIndex;
  const inspected = points[inspectedIndex];
  const isPreview = hoverIndex !== null && hoverIndex !== activeIndex;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Data timeline</h2>
          <span className="text-xs text-slate-500">
            {points.length} points · {formatDate(points[0].asOf)} – {formatDate(points[lastIndex].asOf)}
          </span>
        </div>

        <div className="hidden flex-wrap items-center gap-3 md:flex">
          {SOURCE_ORDER.map((source) => (
            <span key={source} className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <span className={cn('h-2 w-2 rounded-full', SOURCE_STYLES[source].dot)} />
              {SOURCE_LABELS[source]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <span className="h-2 w-2 rotate-45 rounded-[1px] bg-slate-800" />
            Milestone
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ControlButton label="Previous point (←)" onClick={() => onStep(-1)} disabled={activeIndex === 0}>
            <ChevronLeft className="h-4 w-4" />
          </ControlButton>
          <button
            type="button"
            onClick={onTogglePlay}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition',
              isPlaying ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
            )}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPlaying ? 'Pause' : 'Replay'}
          </button>
          <ControlButton label="Next point (→)" onClick={() => onStep(1)} disabled={activeIndex === lastIndex}>
            <ChevronRight className="h-4 w-4" />
          </ControlButton>
          <ControlButton label="Jump to latest (End)" onClick={() => onSelect(lastIndex)} disabled={activeIndex === lastIndex}>
            <SkipForward className="h-4 w-4" />
          </ControlButton>
        </div>
      </div>

      <div className="scroll-thin overflow-x-auto">
        <div className="min-w-[980px] px-12 pb-2 pt-3" onMouseLeave={() => setHoverIndex(null)}>
          <div className="relative h-[92px]">
            <div className="absolute inset-x-0 h-1 -translate-y-1/2 rounded-full bg-slate-200" style={{ top: TRACK_CENTER_PX }} />
            <div
              className="absolute left-0 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-300 to-indigo-600 transition-[width] duration-300 ease-out"
              style={{ top: TRACK_CENTER_PX, width: `${position(activeIndex)}%` }}
            />

            {points.map((point, index) => {
              const isActive = index === activeIndex;
              const isPast = index <= activeIndex;
              const isMilestone = point.milestone !== null;
              const leadSource = point.documents[0]?.source;
              const pastStyle = leadSource
                ? cn(SOURCE_STYLES[leadSource].dot, SOURCE_STYLES[leadSource].border)
                : 'bg-slate-800 border-slate-800';

              return (
                <div key={point.id} className="absolute top-0 -translate-x-1/2" style={{ left: `${position(index)}%` }}>
                  {isActive && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                      {formatShortDate(point.asOf)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(index)}
                    onMouseEnter={() => setHoverIndex(index)}
                    onFocus={() => setHoverIndex(index)}
                    onBlur={() => setHoverIndex(null)}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`${formatDate(point.asOf)}${isMilestone ? ` (${point.milestone})` : ''}: ${point.documents.length} documents`}
                    className="group absolute left-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    style={{ top: TRACK_CENTER_PX }}
                  >
                    <span
                      className={cn(
                        'block border-2 transition-all duration-200 group-hover:scale-125',
                        isMilestone ? 'h-3.5 w-3.5 rotate-45 rounded-[3px]' : 'h-3 w-3 rounded-full',
                        isActive
                          ? 'scale-125 border-indigo-600 bg-indigo-600 ring-4 ring-indigo-200'
                          : isPast
                            ? pastStyle
                            : 'border-slate-300 bg-white',
                      )}
                    />
                  </button>

                  <div className="pointer-events-none absolute left-1/2 top-[44px] flex -translate-x-1/2 flex-col items-center gap-1">
                    <div className="flex h-1.5 gap-0.5">
                      {point.documents.map((doc) => (
                        <span
                          key={doc.id}
                          className={cn('h-1.5 w-1.5 rounded-full', SOURCE_STYLES[doc.source].dot, !isPast && 'opacity-40')}
                        />
                      ))}
                    </div>
                    <span
                      className={cn(
                        'whitespace-nowrap text-[10px] tabular-nums',
                        isActive ? 'font-semibold text-indigo-700' : 'text-slate-500',
                      )}
                    >
                      {formatShortDate(point.asOf)}
                    </span>
                    {isMilestone && (
                      <span
                        className={cn(
                          'whitespace-nowrap rounded px-1 text-[10px] font-bold uppercase tracking-wide',
                          isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white',
                        )}
                      >
                        {point.milestone}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex min-h-[46px] flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2">
        <span className={cn('text-xs font-semibold', isPreview ? 'text-slate-500' : 'text-slate-800')}>
          {isPreview ? 'Preview' : 'Selected'} · {formatDate(inspected.asOf)}
        </span>
        {inspected.milestone && (
          <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            <Flag className="h-2.5 w-2.5" /> {inspected.milestone}
          </span>
        )}
        <span className="text-xs text-slate-500">
          {inspected.documents.length === 0
            ? 'Checkpoint only, no documents ingested on this day'
            : `${inspected.documents.length} document${inspected.documents.length === 1 ? '' : 's'} ingested`}
        </span>
        {inspected.documents.map((doc) => (
          <span
            key={doc.id}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm"
          >
            <SourceBadge source={doc.source} />
            <span className="font-medium text-slate-800">{doc.title}</span>
            <span className="text-slate-400">
              v{doc.version} · {doc.author}
            </span>
          </span>
        ))}
        <span className="ml-auto hidden text-[10px] text-slate-400 lg:inline">← → to step · Home / End to jump</span>
      </div>
    </section>
  );
}

interface ControlButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}

function ControlButton({ label, onClick, disabled, children }: ControlButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-7 w-7 place-items-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
