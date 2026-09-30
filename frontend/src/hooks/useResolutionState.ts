import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthorityDomain, ManualOverrideMap, ResolutionContext, SourceRankMap, SourceSystem } from '../types';
import { DEFAULT_RANKINGS, moveSourceRank, rankingsEqual } from '../utils/engine';
import { parseOverrides, parseRankings, readStorage, STORAGE_KEYS, writeStorage } from '../utils/persistence';

export interface ResolutionState {
  context: ResolutionContext;
  customizationCount: number;
  moveRank: (domain: AuthorityDomain, source: SourceSystem, delta: number) => void;
  setOverride: (fieldKey: string, source: SourceSystem, documentId: string) => void;
  clearOverride: (fieldKey: string) => void;
  resetToDefaults: () => void;
}

export function useResolutionState(): ResolutionState {
  const [rankings, setRankings] = useState<SourceRankMap>(() => readStorage(STORAGE_KEYS.rankings, parseRankings));
  const [overrides, setOverrides] = useState<ManualOverrideMap>(() => readStorage(STORAGE_KEYS.overrides, parseOverrides));

  useEffect(() => {
    writeStorage(STORAGE_KEYS.rankings, rankingsEqual(rankings, DEFAULT_RANKINGS) ? null : rankings);
  }, [rankings]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.overrides, Object.keys(overrides).length === 0 ? null : overrides);
  }, [overrides]);

  const moveRank = useCallback((domain: AuthorityDomain, source: SourceSystem, delta: number) => {
    setRankings((current) => moveSourceRank(current, domain, source, delta));
  }, []);

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

  const resetToDefaults = useCallback(() => {
    setRankings(DEFAULT_RANKINGS);
    setOverrides({});
  }, []);

  const context = useMemo<ResolutionContext>(() => ({ rankings, overrides }), [rankings, overrides]);
  const customizedDomains = useMemo(
    () => (Object.keys(rankings) as AuthorityDomain[]).filter((d) => rankings[d].join() !== DEFAULT_RANKINGS[d].join()).length,
    [rankings],
  );

  return {
    context,
    customizationCount: customizedDomains + Object.keys(overrides).length,
    moveRank,
    setOverride,
    clearOverride,
    resetToDefaults,
  };
}
