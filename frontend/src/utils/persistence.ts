import { AUTHORITY_DOMAINS, SOURCE_ORDER } from '../config/sources';
import type { ManualOverride, ManualOverrideMap, SourceRankMap, SourceSystem } from '../types';
import { DEFAULT_RANKINGS } from './engine';

export const STORAGE_KEYS = {
  overrides: 'customer360_overrides',
  rankings: 'customer360_rankings',
} as const;

function isSourceSystem(value: unknown): value is SourceSystem {
  return typeof value === 'string' && (SOURCE_ORDER as string[]).includes(value);
}

/** Keeps valid stored order, drops unknown sources and appends any missing ones in default order. */
export function parseRankings(raw: unknown): SourceRankMap {
  const rankings = { ...DEFAULT_RANKINGS };
  if (!raw || typeof raw !== 'object') return rankings;
  const stored = raw as Record<string, unknown>;

  for (const domain of AUTHORITY_DOMAINS) {
    const list = stored[domain];
    if (!Array.isArray(list)) continue;
    const valid = [...new Set(list.filter(isSourceSystem))];
    const missing = DEFAULT_RANKINGS[domain].filter((s) => !valid.includes(s));
    rankings[domain] = [...valid, ...missing];
  }
  return rankings;
}

export function parseOverrides(raw: unknown): ManualOverrideMap {
  if (!raw || typeof raw !== 'object') return {};
  const overrides: ManualOverrideMap = {};

  for (const [fieldKey, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const candidate = value as Partial<ManualOverride>;
    if (
      isSourceSystem(candidate.source) &&
      typeof candidate.documentId === 'string' &&
      typeof candidate.createdAt === 'string' &&
      !Number.isNaN(Date.parse(candidate.createdAt))
    ) {
      overrides[fieldKey] = {
        fieldKey,
        source: candidate.source,
        documentId: candidate.documentId,
        createdAt: candidate.createdAt,
      };
    }
  }
  return overrides;
}

export function readStorage<T>(key: string, parse: (raw: unknown) => T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return parse(raw === null ? null : JSON.parse(raw));
  } catch {
    return parse(null);
  }
}

export function writeStorage(key: string, value: unknown | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage may be unavailable (private mode, quota); state still works in memory. */
  }
}
