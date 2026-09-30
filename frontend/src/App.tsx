import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChangeFeed } from './components/ChangeFeed';
import { ConflictInspector } from './components/ConflictInspector';
import { DocumentInspectorModal } from './components/DocumentInspectorModal';
import { GoldenRecordPanel } from './components/GoldenRecordPanel';
import { HeaderBar } from './components/HeaderBar';
import { HierarchyManagerModal } from './components/HierarchyManagerModal';
import { TimelineScrubber } from './components/TimelineScrubber';
import { useResolutionState } from './hooks/useResolutionState';
import { useTimelinePlayback } from './hooks/useTimelinePlayback';
import { CLIENT_DOCUMENTS, CLIENT_PROFILE } from './mock/clientHistory';
import type {
  AuthorityDomain,
  DocumentInspectionState,
  FieldConflict,
  HierarchyManagerState,
  SourceClaim,
} from './types';
import {
  buildSnapshot,
  buildTimeline,
  computeRankingImpact,
  computeSnapshotDiff,
  lastSyncedBySource,
  valuesEqual,
} from './utils/engine';

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
  const [hierarchy, setHierarchy] = useState<HierarchyManagerState | null>(null);
  const resolution = useResolutionState();
  const { context, setOverride, clearOverride, resolveConflict, reopenConflict, replaceRankings } = resolution;

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

  const conflictDocumentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const conflict of snapshot.conflicts) {
      if (conflict.status !== 'active') continue;
      for (const claim of conflict.conflictingValues) ids.add(claim.documentId);
    }
    return ids;
  }, [snapshot]);
  const otherResolutions = useMemo(() => {
    const inSnapshot = new Set(snapshot.conflicts.map((c) => c.conflictId));
    return Object.values(context.resolutions)
      .filter((r) => !inSnapshot.has(r.conflictId))
      .sort((a, b) => Date.parse(b.resolvedAt) - Date.parse(a.resolvedAt));
  }, [snapshot, context.resolutions]);

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

  const openHierarchy = useCallback(
    (domain: AuthorityDomain) => setHierarchy({ domain, baseline: context.rankings }),
    [context.rankings],
  );
  const closeHierarchy = useCallback(() => setHierarchy(null), []);

  const hierarchyImpact = useMemo(() => {
    if (!hierarchy) return [];
    const baseline = buildSnapshot(new Date(snapshot.asOf), { ...context, rankings: hierarchy.baseline });
    return computeRankingImpact(baseline.goldenRecord, snapshot.goldenRecord);
  }, [hierarchy, snapshot, context]);
  const lastSynced = useMemo(() => lastSyncedBySource(snapshot.documents), [snapshot.documents]);

  const pickWinner = useCallback(
    (conflict: FieldConflict, claim: SourceClaim) => setOverride(conflict.fieldKey, claim.source, claim.documentId),
    [setOverride],
  );
  const resolveActive = useCallback(
    (conflict: FieldConflict) => resolveConflict(conflict, snapshot.asOf),
    [resolveConflict, snapshot.asOf],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (inspection || hierarchy || isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
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
  }, [inspection, hierarchy, handleStep, handleSelect, lastIndex]);

  const focusedDomain = snapshot.goldenRecord.find((e) => e.key === focusedField)?.domain ?? 'headcount';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <HeaderBar
        profile={CLIENT_PROFILE}
        snapshot={snapshot}
        totalDocuments={CLIENT_DOCUMENTS.length}
        isLatest={activeIndex === lastIndex}
        customizationCount={resolution.customizationCount}
        onJumpToLatest={() => handleSelect(lastIndex)}
        onManageHierarchy={() => openHierarchy(focusedDomain)}
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
          conflictDocumentIds={conflictDocumentIds}
          footer={<ChangeFeed diff={diff} focusedField={focusedField} onFocusField={focusField} />}
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <GoldenRecordPanel
            className={PANEL_HEIGHT}
            entries={snapshot.goldenRecord}
            focusedField={focusedField}
            onFocusField={focusField}
            onOpenHierarchy={openHierarchy}
          />
          <ConflictInspector
            className={PANEL_HEIGHT}
            conflicts={snapshot.conflicts}
            otherResolutions={otherResolutions}
            focusedField={focusedField}
            onFocusField={focusField}
            onInspect={openInspector}
            onPickWinner={pickWinner}
            onClearOverride={clearOverride}
            onResolve={resolveActive}
            onReopen={reopenConflict}
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
          onResolve={(claim) => {
            resolveConflict(inspectedConflict, snapshot.asOf, claim);
            closeInspector();
          }}
          onReopen={() => reopenConflict(inspectedConflict.conflictId)}
          onClose={closeInspector}
        />
      )}

      {hierarchy && (
        <HierarchyManagerModal
          domain={hierarchy.domain}
          rankings={context.rankings}
          baseline={hierarchy.baseline}
          impact={hierarchyImpact}
          goldenRecord={snapshot.goldenRecord}
          lastSynced={lastSynced}
          onSelectDomain={(domain) => setHierarchy((current) => current && { ...current, domain })}
          onMove={resolution.moveRank}
          onUndo={() => replaceRankings(hierarchy.baseline)}
          onResetDefaults={resolution.resetRankings}
          onClose={closeHierarchy}
        />
      )}
    </div>
  );
}
