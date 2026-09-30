import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AuthorityDomain,
  FieldConflict,
  ManualOverrideMap,
  ResolutionContext,
  ResolvedConflict,
  ResolvedConflictMap,
  SourceClaim,
  SourceRankMap,
  SourceSystem,
} from '../types';
import { DEFAULT_RANKINGS, moveSourceRank, rankingsEqual } from '../utils/engine';
import {
  parseOverrides,
  parseRankings,
  parseResolvedConflicts,
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from '../utils/persistence';

export interface ResolutionState {
  context: ResolutionContext;
  customizationCount: number;
  rankingsCustomized: boolean;
  moveRank: (domain: AuthorityDomain, source: SourceSystem, delta: number) => void;
  replaceRankings: (rankings: SourceRankMap) => void;
  resetRankings: () => void;
  setOverride: (fieldKey: string, source: SourceSystem, documentId: string) => void;
  clearOverride: (fieldKey: string) => void;
  /** Without `claim`, confirms the conflict's current winner (ranking or manual override). */
  resolveConflict: (conflict: FieldConflict, snapshotAsOf: string, claim?: SourceClaim) => void;
  reopenConflict: (conflictId: string) => void;
  resetToDefaults: () => void;
}

export function useResolutionState(): ResolutionState {
  const [rankings, setRankings] = useState<SourceRankMap>(() => readStorage(STORAGE_KEYS.rankings, parseRankings));
  const [overrides, setOverrides] = useState<ManualOverrideMap>(() => readStorage(STORAGE_KEYS.overrides, parseOverrides));
  const [resolutions, setResolutions] = useState<ResolvedConflictMap>(() =>
    readStorage(STORAGE_KEYS.resolvedConflicts, parseResolvedConflicts),
  );

  useEffect(() => {
    writeStorage(STORAGE_KEYS.rankings, rankingsEqual(rankings, DEFAULT_RANKINGS) ? null : rankings);
  }, [rankings]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.overrides, Object.keys(overrides).length === 0 ? null : overrides);
  }, [overrides]);

  useEffect(() => {
    const list = Object.values(resolutions);
    writeStorage(STORAGE_KEYS.resolvedConflicts, list.length === 0 ? null : list);
  }, [resolutions]);

  const moveRank = useCallback((domain: AuthorityDomain, source: SourceSystem, delta: number) => {
    setRankings((current) => moveSourceRank(current, domain, source, delta));
  }, []);

  const replaceRankings = useCallback((next: SourceRankMap) => setRankings(next), []);
  const resetRankings = useCallback(() => setRankings(DEFAULT_RANKINGS), []);

  const setOverride = useCallback((fieldKey: string, source: SourceSystem, documentId: string) => {
    setOverrides((current) => ({
      ...current,
      [fieldKey]: { fieldKey, source, documentId, createdAt: new Date().toISOString() },
    }));
  }, []);

  const clearOverride = useCallback((fieldKey: string) => {
    setOverrides((current) => {
      if (!(fieldKey in current)) return current;
      const next = { ...current };
      delete next[fieldKey];
      return next;
    });
  }, []);

  const resolveConflict = useCallback((conflict: FieldConflict, snapshotAsOf: string, claim?: SourceClaim) => {
    const winner = claim ?? conflict.conflictingValues[0];
    const record: ResolvedConflict = {
      conflictId: conflict.conflictId,
      fieldKey: conflict.fieldKey,
      winningSource: winner.source,
      resolvedValue: winner.value,
      resolvedAt: new Date().toISOString(),
      documentId: winner.documentId,
      method: claim ? 'document' : conflict.method,
      snapshotAsOf,
    };
    setResolutions((current) => ({ ...current, [record.conflictId]: record }));
  }, []);

  const reopenConflict = useCallback((conflictId: string) => {
    setResolutions((current) => {
      if (!(conflictId in current)) return current;
      const next = { ...current };
      delete next[conflictId];
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setRankings(DEFAULT_RANKINGS);
    setOverrides({});
    setResolutions({});
  }, []);

  const context = useMemo<ResolutionContext>(() => ({ rankings, overrides, resolutions }), [rankings, overrides, resolutions]);
  const customizedDomains = useMemo(
    () => (Object.keys(rankings) as AuthorityDomain[]).filter((d) => rankings[d].join() !== DEFAULT_RANKINGS[d].join()).length,
    [rankings],
  );

  return {
    context,
    customizationCount: customizedDomains + Object.keys(overrides).length + Object.keys(resolutions).length,
    rankingsCustomized: customizedDomains > 0,
    moveRank,
    replaceRankings,
    resetRankings,
    setOverride,
    clearOverride,
    resolveConflict,
    reopenConflict,
    resetToDefaults,
  };
}
