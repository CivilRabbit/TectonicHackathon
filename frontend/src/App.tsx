import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChangeFeed } from './components/ChangeFeed';
import { ConflictInspector } from './components/ConflictInspector';
import { DocumentInspectorModal } from './components/DocumentInspectorModal';
import { GoldenRecordPanel } from './components/GoldenRecordPanel';
import { HeaderBar } from './components/HeaderBar';
import { TimelineScrubber } from './components/TimelineScrubber';
import { useResolutionState } from './hooks/useResolutionState';
import { useTimelinePlayback } from './hooks/useTimelinePlayback';
import { CLIENT_DOCUMENTS, CLIENT_PROFILE } from './mock/clientHistory';
import type { ConflictSeverity, DocumentInspectionState, FieldConflict, SourceClaim } from './types';
import { buildSnapshot, buildTimeline, computeSnapshotDiff, valuesEqual } from './utils/engine';

const PANEL_HEIGHT = 'h-[640px] xl:h-[calc(100vh-15.5rem)] xl:min-h-[520px]';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export default function App() {
  const points = useMemo(() => buildTimeline(), []);
  const lastIndex = points.length - 1;
  const [activeIndex, setActiveIndex] = useState(lastIndex);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [inspection, setInspection] = useState<DocumentInspectionState | null>(null);
  const resolution = useResolutionState();
  const { context, setOverride, clearOverride } = resolution;

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
  const focusField = useCallback((key: string) => setFocusedField(key), []);

  const activePoint = points[activeIndex];
  const snapshot = useMemo(() => buildSnapshot(new Date(activePoint.asOf), context), [activePoint, context]);
  const previousSnapshot = useMemo(
    () => (activeIndex > 0 ? buildSnapshot(new Date(points[activeIndex - 1].asOf), context) : null),
    [activeIndex, points, context],
  );
  const diff = useMemo(() => computeSnapshotDiff(snapshot, previousSnapshot), [snapshot, previousSnapshot]);

  const conflictSeverityByKey = useMemo(
    () => new Map<string, ConflictSeverity>(snapshot.conflicts.map((c) => [c.fieldKey, c.severity])),
    [snapshot],
  );
  const inspectedConflict = inspection ? snapshot.conflicts.find((c) => c.fieldKey === inspection.fieldKey) : undefined;

  useEffect(() => {
    if (inspection && !inspectedConflict) setInspection(null);
  }, [inspection, inspectedConflict]);

  const openInspector = useCallback((conflict: FieldConflict) => {
    const [winner, ...rest] = conflict.conflictingValues;
    const challenger = rest.find((c) => !valuesEqual(c.value, winner.value)) ?? rest[0];
    setInspection({ fieldKey: conflict.fieldKey, leftDocumentId: winner.documentId, rightDocumentId: challenger.documentId });
  }, []);
  const closeInspector = useCallback(() => setInspection(null), []);

  const pickWinner = useCallback(
    (conflict: FieldConflict, claim: SourceClaim) => setOverride(conflict.fieldKey, claim.source, claim.documentId),
    [setOverride],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (inspection || isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
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
  }, [inspection, handleStep, handleSelect, lastIndex]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <HeaderBar
        profile={CLIENT_PROFILE}
        snapshot={snapshot}
        totalDocuments={CLIENT_DOCUMENTS.length}
        isLatest={activeIndex === lastIndex}
        customizationCount={resolution.customizationCount}
        onJumpToLatest={() => handleSelect(lastIndex)}
        onResetDefaults={resolution.resetToDefaults}
      />

      <main className="mx-auto max-w-[1600px] space-y-3 px-4 py-3">
        <TimelineScrubber
          points={points}
          activeIndex={activeIndex}
          isPlaying={playback.isPlaying}
          onSelect={handleSelect}
          onStep={handleStep}
          onTogglePlay={playback.toggle}
          footer={<ChangeFeed diff={diff} focusedField={focusedField} onFocusField={focusField} />}
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <GoldenRecordPanel
            className={PANEL_HEIGHT}
            entries={snapshot.goldenRecord}
            rankings={context.rankings}
            conflictSeverityByKey={conflictSeverityByKey}
            focusedField={focusedField}
            onFocusField={focusField}
            onMoveRank={resolution.moveRank}
            onClearOverride={clearOverride}
          />
          <ConflictInspector
            className={PANEL_HEIGHT}
            conflicts={snapshot.conflicts}
            focusedField={focusedField}
            onFocusField={focusField}
            onInspect={openInspector}
            onPickWinner={pickWinner}
            onClearOverride={clearOverride}
          />
        </div>
      </main>

      {inspection && inspectedConflict && (
        <DocumentInspectorModal
          inspection={inspection}
          conflict={inspectedConflict}
          onChangeDocument={(side, documentId) =>
            setInspection((current) =>
              current && { ...current, [side === 'left' ? 'leftDocumentId' : 'rightDocumentId']: documentId },
            )
          }
          onAdopt={(claim) => setOverride(inspectedConflict.fieldKey, claim.source, claim.documentId)}
          onClose={closeInspector}
        />
      )}
    </div>
  );
}
