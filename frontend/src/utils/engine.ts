import type {
  AuthorityDomain,
  ClientDocument,
  ClientSnapshot,
  ConflictDelta,
  ConflictSeverity,
  FieldChange,
  FieldConflict,
  FieldDefinition,
  FieldValue,
  GoldenRecordEntry,
  HealthBreakdown,
  Milestone,
  SnapshotDiff,
  SourceClaim,
  SourceSystem,
  TimelinePoint,
} from '../types';
import { CLIENT_DOCUMENTS, FIELD_ALIASES, FIELD_DEFINITIONS, MILESTONES, SYSTEM_WEIGHTS } from '../mock/clientHistory';
import { DOMAIN_LABELS, SOURCE_LABELS } from '../config/sources';
import { formatDate } from './format';

export const STALE_AFTER_DAYS = 180;
const DAY_MS = 86_400_000;
const DEFAULT_CRITICAL_DRIFT_PCT = 10;
const CRITICAL_PENALTY = 12;
const WARNING_PENALTY = 5;
const STALE_FIELD_PENALTY = 1;
const MAX_STALENESS_PENALTY = 10;

const FIELD_INDEX = new Map(FIELD_DEFINITIONS.map((definition, order) => [definition.key, { definition, order }]));
const WEIGHT_INDEX = new Map(SYSTEM_WEIGHTS.map((w) => [weightKey(w.source, w.domain), w.weight]));

function weightKey(source: SourceSystem, domain: AuthorityDomain): string {
  return `${source}:${domain}`;
}

function humanizeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

function fieldOrder(key: string): number {
  return FIELD_INDEX.get(key)?.order ?? Number.MAX_SAFE_INTEGER;
}

function compareFieldKeys(a: string, b: string): number {
  return fieldOrder(a) - fieldOrder(b) || a.localeCompare(b);
}

function compareDocuments(a: ClientDocument, b: ClientDocument): number {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id);
}

/** Resolution order: highest authority first, then most recent, then source name for stability. */
function compareClaims(a: SourceClaim, b: SourceClaim): number {
  return b.priority - a.priority || Date.parse(b.timestamp) - Date.parse(a.timestamp) || a.source.localeCompare(b.source);
}

function daysBetween(fromIso: string, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - Date.parse(fromIso)) / DAY_MS));
}

function latestTimestamp(documents: readonly ClientDocument[]): Date {
  const max = documents.reduce((acc, doc) => Math.max(acc, Date.parse(doc.createdAt)), 0);
  return new Date(max);
}

export function canonicalFieldKey(rawKey: string): string {
  return FIELD_ALIASES[rawKey] ?? rawKey;
}

export function getFieldDefinition(key: string): FieldDefinition {
  return (
    FIELD_INDEX.get(key)?.definition ?? {
      key,
      label: humanizeKey(key),
      category: 'company',
      domain: 'company',
      format: 'text',
    }
  );
}

export function getAuthorityWeight(source: SourceSystem, domain: AuthorityDomain, fallback: number): number {
  return WEIGHT_INDEX.get(weightKey(source, domain)) ?? fallback;
}

/** Case- and whitespace-insensitive for strings so cosmetic differences are not flagged as conflicts. */
export function normalizeValue(value: FieldValue): string {
  if (typeof value === 'string') return `s:${value.trim().replace(/\s+/g, ' ').toLowerCase()}`;
  return `${typeof value}:${String(value)}`;
}

export function valuesEqual(a: FieldValue, b: FieldValue): boolean {
  return normalizeValue(a) === normalizeValue(b);
}

function distinctValueCount(claims: readonly SourceClaim[]): number {
  return new Set(claims.map((c) => normalizeValue(c.value))).size;
}

export function getSnapshotAtDate(
  targetDate: Date,
  documents: readonly ClientDocument[] = CLIENT_DOCUMENTS,
): ClientDocument[] {
  const cutoff = targetDate.getTime();
  return documents.filter((doc) => Date.parse(doc.createdAt) <= cutoff).sort(compareDocuments);
}

/**
 * Current claim of every source for every canonical field. A newer document from the same
 * source supersedes its older one; a `null` value retracts the source's claim.
 */
export function collectFieldClaims(documents: readonly ClientDocument[]): Map<string, SourceClaim[]> {
  const latest = new Map<string, Map<SourceSystem, SourceClaim | null>>();

  for (const doc of [...documents].sort(compareDocuments)) {
    for (const [rawKey, value] of Object.entries(doc.payload)) {
      const key = canonicalFieldKey(rawKey);
      const definition = getFieldDefinition(key);
      let perSource = latest.get(key);
      if (!perSource) {
        perSource = new Map();
        latest.set(key, perSource);
      }
      perSource.set(
        doc.source,
        value === null
          ? null
          : {
              source: doc.source,
              value,
              timestamp: doc.createdAt,
              priority: getAuthorityWeight(doc.source, definition.domain, doc.sourcePriority),
              documentId: doc.id,
              author: doc.author,
              version: doc.version,
              sourceField: rawKey,
            },
      );
    }
  }

  const claimsByField = new Map<string, SourceClaim[]>();
  for (const [key, perSource] of latest) {
    const claims = [...perSource.values()].filter((c): c is SourceClaim => c !== null).sort(compareClaims);
    if (claims.length > 0) claimsByField.set(key, claims);
  }
  return claimsByField;
}

export function computeGoldenRecord(
  documents: readonly ClientDocument[],
  asOf: Date = latestTimestamp(documents),
): GoldenRecordEntry[] {
  const entries: GoldenRecordEntry[] = [];

  for (const [key, claims] of collectFieldClaims(documents)) {
    const definition = getFieldDefinition(key);
    const winner = claims[0];
    entries.push({
      key,
      label: definition.label,
      value: winner.value,
      category: definition.category,
      domain: definition.domain,
      format: definition.format,
      source: winner.source,
      priority: winner.priority,
      documentId: winner.documentId,
      createdAt: winner.timestamp,
      freshnessDays: daysBetween(winner.timestamp, asOf),
      contributingSources: claims.map((c) => c.source),
      hasConflict: distinctValueCount(claims) > 1,
    });
  }

  return entries.sort((a, b) => compareFieldKeys(a.key, b.key));
}

function computeDriftPct(claims: readonly SourceClaim[], resolved: FieldValue): number | null {
  if (typeof resolved !== 'number') return null;
  const numeric = claims.map((c) => c.value).filter((v): v is number => typeof v === 'number');
  if (numeric.length !== claims.length) return null;
  if (resolved === 0) return 100;
  const maxDelta = Math.max(...numeric.map((v) => Math.abs(v - resolved)));
  return Math.round((maxDelta / Math.abs(resolved)) * 1000) / 10;
}

function classifySeverity(definition: FieldDefinition, driftPct: number | null): ConflictSeverity {
  if (driftPct !== null) {
    return driftPct >= (definition.criticalDriftPct ?? DEFAULT_CRITICAL_DRIFT_PCT) ? 'critical' : 'warning';
  }
  return definition.conflictSeverity ?? 'warning';
}

function explainResolution(winner: SourceClaim, runnerUp: SourceClaim, definition: FieldDefinition): string {
  const winnerName = SOURCE_LABELS[winner.source];
  const runnerUpName = SOURCE_LABELS[runnerUp.source];
  const domain = DOMAIN_LABELS[definition.domain].toLowerCase();

  if (winner.priority > runnerUp.priority) {
    const newerBy = daysBetween(winner.timestamp, new Date(runnerUp.timestamp));
    const recency =
      newerBy > 0 ? `, even though the ${runnerUpName} record is ${newerBy} day${newerBy === 1 ? '' : 's'} newer` : '';
    return `${winnerName} is the authority for ${domain} (priority ${winner.priority} vs ${runnerUpName} ${runnerUp.priority}), so its value wins${recency}.`;
  }
  return `${winnerName} and ${runnerUpName} share priority ${winner.priority} for ${domain}; the most recent record (${winnerName}, ${formatDate(winner.timestamp)}) wins.`;
}

const SEVERITY_RANK: Record<ConflictSeverity, number> = { critical: 0, warning: 1 };

export function detectConflicts(documents: readonly ClientDocument[]): FieldConflict[] {
  const conflicts: FieldConflict[] = [];

  for (const [key, claims] of collectFieldClaims(documents)) {
    if (distinctValueCount(claims) < 2) continue;
    const definition = getFieldDefinition(key);
    const winner = claims[0];
    const runnerUp = claims.find((c) => !valuesEqual(c.value, winner.value)) ?? claims[1];
    const driftPct = computeDriftPct(claims, winner.value);

    conflicts.push({
      fieldKey: key,
      label: definition.label,
      category: definition.category,
      domain: definition.domain,
      format: definition.format,
      conflictingValues: claims,
      resolvedValue: winner.value,
      resolvedSource: winner.source,
      severity: classifySeverity(definition, driftPct),
      driftPct,
      rationale: explainResolution(winner, runnerUp, definition),
    });
  }

  return conflicts.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || compareFieldKeys(a.fieldKey, b.fieldKey),
  );
}

export function computeHealthScore(
  goldenRecord: readonly GoldenRecordEntry[],
  conflicts: readonly FieldConflict[],
): HealthBreakdown {
  const criticalCount = conflicts.filter((c) => c.severity === 'critical').length;
  const warningCount = conflicts.length - criticalCount;
  const staleFields = goldenRecord.filter((e) => e.freshnessDays > STALE_AFTER_DAYS).length;
  const conflictPenalty = criticalCount * CRITICAL_PENALTY + warningCount * WARNING_PENALTY;
  const stalenessPenalty = Math.min(MAX_STALENESS_PENALTY, staleFields * STALE_FIELD_PENALTY);
  const score = goldenRecord.length === 0 ? 0 : Math.max(0, Math.min(100, 100 - conflictPenalty - stalenessPenalty));

  return { score, criticalCount, warningCount, staleFields, conflictPenalty, stalenessPenalty };
}

export function buildSnapshot(asOf: Date, documents: readonly ClientDocument[] = CLIENT_DOCUMENTS): ClientSnapshot {
  const visible = getSnapshotAtDate(asOf, documents);
  const goldenRecord = computeGoldenRecord(visible, asOf);
  const conflicts = detectConflicts(visible);
  return {
    asOf: asOf.toISOString(),
    documents: visible,
    goldenRecord,
    conflicts,
    health: computeHealthScore(goldenRecord, conflicts),
  };
}

function toConflictDelta(conflict: FieldConflict): ConflictDelta {
  return { fieldKey: conflict.fieldKey, label: conflict.label, severity: conflict.severity };
}

export function computeSnapshotDiff(current: ClientSnapshot, previous: ClientSnapshot | null): SnapshotDiff {
  const before = new Map((previous?.goldenRecord ?? []).map((e) => [e.key, e]));
  const after = new Map(current.goldenRecord.map((e) => [e.key, e]));
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort(compareFieldKeys);

  const changes: FieldChange[] = keys.map((key) => {
    const prev = before.get(key);
    const next = after.get(key);
    const reference = (next ?? prev) as GoldenRecordEntry;
    const type: FieldChange['type'] = !prev
      ? 'added'
      : !next
        ? 'removed'
        : valuesEqual(prev.value, next.value)
          ? 'unchanged'
          : 'modified';

    return {
      fieldKey: key,
      label: reference.label,
      category: reference.category,
      format: reference.format,
      type,
      previousValue: prev?.value ?? null,
      currentValue: next?.value ?? null,
      previousSource: prev?.source ?? null,
      currentSource: next?.source ?? null,
    };
  });

  const previousConflictKeys = new Set((previous?.conflicts ?? []).map((c) => c.fieldKey));
  const currentConflictKeys = new Set(current.conflicts.map((c) => c.fieldKey));
  const previousAsOf = previous ? Date.parse(previous.asOf) : Number.NEGATIVE_INFINITY;

  return {
    fromDate: previous?.asOf ?? null,
    toDate: current.asOf,
    changes,
    added: changes.filter((c) => c.type === 'added'),
    modified: changes.filter((c) => c.type === 'modified'),
    removed: changes.filter((c) => c.type === 'removed'),
    unchanged: changes.filter((c) => c.type === 'unchanged'),
    conflictsOpened: current.conflicts.filter((c) => !previousConflictKeys.has(c.fieldKey)).map(toConflictDelta),
    conflictsResolved: (previous?.conflicts ?? []).filter((c) => !currentConflictKeys.has(c.fieldKey)).map(toConflictDelta),
    ingestedDocuments: current.documents.filter((d) => Date.parse(d.createdAt) > previousAsOf),
  };
}

/** One point per UTC day with ingestion activity, merged with the quarterly milestones. */
export function buildTimeline(
  documents: readonly ClientDocument[] = CLIENT_DOCUMENTS,
  milestones: readonly Milestone[] = MILESTONES,
): TimelinePoint[] {
  const byDay = new Map<string, { documents: ClientDocument[]; milestone: Milestone | null }>();

  for (const doc of [...documents].sort(compareDocuments)) {
    const day = doc.createdAt.slice(0, 10);
    const bucket = byDay.get(day);
    if (bucket) bucket.documents.push(doc);
    else byDay.set(day, { documents: [doc], milestone: null });
  }
  for (const milestone of milestones) {
    const bucket = byDay.get(milestone.date);
    if (bucket) bucket.milestone = milestone;
    else byDay.set(milestone.date, { documents: [], milestone });
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, bucket]) => ({
      id: `pt-${day}`,
      dayKey: day,
      asOf: bucket.milestone?.asOf ?? `${day}T23:59:59.999Z`,
      milestone: bucket.milestone?.label ?? null,
      documents: bucket.documents,
    }));
}
