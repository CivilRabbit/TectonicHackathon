import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConflictInspector } from './components/ConflictInspector';
import { DiffPanel } from './components/DiffPanel';
import { GoldenRecordPanel } from './components/GoldenRecordPanel';
import { HeaderBar } from './components/HeaderBar';
import { SourceViewerDialog } from './components/SourceViewerDialog';
import { TimelineScrubber } from './components/TimelineScrubber';
import { useTimelinePlayback } from './hooks/useTimelinePlayback';
import { CLIENT_DOCUMENTS, CLIENT_PROFILE } from './mock/clientHistory';
import type { ConflictSeverity, DiffChangeType } from './types';
import { buildSnapshot, buildTimeline, computeSnapshotDiff } from './utils/engine';

const PANEL_HEIGHT = 'h-[620px] xl:h-[calc(100vh-22rem)] xl:min-h-[560px]';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export default function App() {
  const points = useMemo(() => buildTimeline(), []);
  const lastIndex = points.length - 1;
  const [activeIndex, setActiveIndex] = useState(lastIndex);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);

  const selectIndex = useCallback(
    (index: number) => setActiveIndex(Math.max(0, Math.min(lastIndex, index))),
    [lastIndex],
  );
  const playback = useTimelinePlayback(activeIndex, lastIndex, selectIndex);
  const { stop } = playback;

  const handleSelect = useCallback(
    (index: number) => {
      stop();
      selectIndex(index);
    },
    [stop, selectIndex],
  );
  const handleStep = useCallback(
    (delta: number) => {
      stop();
      setActiveIndex((index) => Math.max(0, Math.min(lastIndex, index + delta)));
    },
    [stop, lastIndex],
  );
  const toggleFocus = useCallback((key: string) => setFocusedField((current) => (current === key ? null : key)), []);
  const openSource = useCallback(
    (documentId: string) => {
      const index = points.findIndex((point) => point.documents.some((doc) => doc.id === documentId));
      if (index === -1) return;
      stop();
      selectIndex(index);
      setSourceId(documentId);
    },
    [points, stop, selectIndex],
  );
  const closeSource = useCallback(() => setSourceId(null), []);

  const activePoint = points[activeIndex];
  const snapshot = useMemo(() => buildSnapshot(new Date(activePoint.asOf)), [activePoint]);
  const previousSnapshot = useMemo(
    () => (activeIndex > 0 ? buildSnapshot(new Date(points[activeIndex - 1].asOf)) : null),
    [activeIndex, points],
  );
  const diff = useMemo(() => computeSnapshotDiff(snapshot, previousSnapshot), [snapshot, previousSnapshot]);

  const conflictSeverityByKey = useMemo(
    () => new Map<string, ConflictSeverity>(snapshot.conflicts.map((c) => [c.fieldKey, c.severity])),
    [snapshot],
  );
  const changeTypeByKey = useMemo(
    () => new Map<string, DiffChangeType>(diff.changes.filter((c) => c.type !== 'unchanged').map((c) => [c.fieldKey, c.type])),
    [diff],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (sourceId) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setSourceId(null);
        }
        return;
      }
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handleStep(-1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleStep(1);
          break;
        case 'Home':
          event.preventDefault();
          handleSelect(0);
          break;
        case 'End':
          event.preventDefault();
          handleSelect(lastIndex);
          break;
        case 'Escape':
          setFocusedField(null);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleStep, handleSelect, lastIndex, sourceId]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <HeaderBar
        profile={CLIENT_PROFILE}
        snapshot={snapshot}
        totalDocuments={CLIENT_DOCUMENTS.length}
        isLatest={activeIndex === lastIndex}
        onJumpToLatest={() => handleSelect(lastIndex)}
      />

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-4">
        <TimelineScrubber
          points={points}
          activeIndex={activeIndex}
          isPlaying={playback.isPlaying}
          onSelect={handleSelect}
          onStep={handleStep}
          onTogglePlay={playback.toggle}
          onOpenSource={openSource}
          onCloseSource={closeSource}
        />

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
          <GoldenRecordPanel
            className={`${PANEL_HEIGHT} xl:col-span-4`}
            entries={snapshot.goldenRecord}
            conflictSeverityByKey={conflictSeverityByKey}
            changeTypeByKey={changeTypeByKey}
            focusedField={focusedField}
            onFocusField={toggleFocus}
          />
          <ConflictInspector
            className={`${PANEL_HEIGHT} xl:col-span-5`}
            conflicts={snapshot.conflicts}
            asOf={snapshot.asOf}
            focusedField={focusedField}
            onFocusField={toggleFocus}
          />
          <DiffPanel
            className={`${PANEL_HEIGHT} lg:col-span-2 xl:col-span-3`}
            diff={diff}
            focusedField={focusedField}
            onFocusField={toggleFocus}
            onOpenSource={openSource}
          />
        </div>

        <footer className="pb-2 text-center text-[11px] text-slate-400">
          Invented emails, company chats, and documents for a fictional client · reconciliation runs locally in the browser
        </footer>
      </main>

      {sourceId && (
        <SourceViewerDialog
          documents={points.find((point) => point.documents.some((doc) => doc.id === sourceId))?.documents ?? []}
          documentId={sourceId}
          onSelectDocument={setSourceId}
          onClose={closeSource}
        />
      )}
    </div>
  );
}
