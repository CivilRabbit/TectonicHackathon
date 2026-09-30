import { AUTHORITY_DOMAINS, SOURCE_ORDER } from '../config/sources';
import type {
  FieldValue,
  ManualOverride,
  ManualOverrideMap,
  ResolvedConflict,
  ResolvedConflictMap,
  SourceRankMap,
  SourceSystem,
} from '../types';
import { DEFAULT_RANKINGS } from './engine';

export const STORAGE_KEYS = {
  overrides: 'customer360_overrides',
  rankings: 'customer360_rankings',
  resolvedConflicts: 'customer360_resolved_conflicts',
} as const;

const RESOLUTION_METHODS: ReadonlyArray<ResolvedConflict['method']> = ['ranking', 'override', 'document'];

function isFieldValue(value: unknown): value is FieldValue {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

/** Stored as an array; returned keyed by `conflictId`. Invalid entries are dropped. */
export function parseResolvedConflicts(raw: unknown): ResolvedConflictMap {
  if (!Array.isArray(raw)) return {};
  const resolutions: ResolvedConflictMap = {};

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Partial<ResolvedConflict>;
    if (
      typeof c.conflictId === 'string' &&
      typeof c.fieldKey === 'string' &&
      typeof c.documentId === 'string' &&
      isSourceSystem(c.winningSource) &&
      isFieldValue(c.resolvedValue) &&
      isIsoDate(c.resolvedAt) &&
      isIsoDate(c.snapshotAsOf) &&
      c.method !== undefined &&
      RESOLUTION_METHODS.includes(c.method)
    ) {
      resolutions[c.conflictId] = {
        conflictId: c.conflictId,
        fieldKey: c.fieldKey,
        winningSource: c.winningSource,
        resolvedValue: c.resolvedValue,
        resolvedAt: c.resolvedAt,
        documentId: c.documentId,
        method: c.method,
        snapshotAsOf: c.snapshotAsOf,
      };
    }
  }
  return resolutions;
}

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
