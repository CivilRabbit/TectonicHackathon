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
  ManualOverride,
  Milestone,
  ResolutionContext,
  SnapshotDiff,
  SourceClaim,
  SourceRankMap,
  SourceSystem,
  SystemWeight,
  TimelinePoint,
} from '../types';
import { CLIENT_DOCUMENTS, FIELD_ALIASES, FIELD_DEFINITIONS, MILESTONES, SYSTEM_WEIGHTS } from '../mock/clientHistory';
import { AUTHORITY_DOMAINS, DOMAIN_LABELS, SOURCE_LABELS, SOURCE_ORDER } from '../config/sources';
import { formatDate } from './format';

export const STALE_AFTER_DAYS = 180;
const DAY_MS = 86_400_000;
const DEFAULT_CRITICAL_DRIFT_PCT = 10;
const CRITICAL_PENALTY = 12;
const WARNING_PENALTY = 5;
const STALE_FIELD_PENALTY = 1;
const MAX_STALENESS_PENALTY = 10;

const FIELD_INDEX = new Map(FIELD_DEFINITIONS.map((definition, order) => [definition.key, { definition, order }]));
const DOCUMENT_INDEX = new Map(CLIENT_DOCUMENTS.map((doc) => [doc.id, doc]));

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

/** Resolution order by ranking: rank #1 first, then most recent, then source name for stability. */
function compareClaims(a: SourceClaim, b: SourceClaim): number {
  return a.rank - b.rank || Date.parse(b.timestamp) - Date.parse(a.timestamp) || a.source.localeCompare(b.source);
}

function daysBetween(fromIso: string, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - Date.parse(fromIso)) / DAY_MS));
}

function latestTimestamp(documents: readonly ClientDocument[]): Date {
  const max = documents.reduce((acc, doc) => Math.max(acc, Date.parse(doc.createdAt)), 0);
  return new Date(max);
}

export function getDocumentById(id: string): ClientDocument | undefined {
  return DOCUMENT_INDEX.get(id);
}

export function canonicalFieldKey(rawKey: string): string {
  return FIELD_ALIASES[rawKey] ?? rawKey;
}

export function getFieldDefinition(key: string): FieldDefinition {
  return (
    FIELD_INDEX.get(key)?.definition ?? {
      key,
      code: key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase(),
      label: humanizeKey(key),
      category: 'company',
      domain: 'company',
      format: 'text',
    }
  );
}

export function buildDefaultRankings(weights: readonly SystemWeight[] = SYSTEM_WEIGHTS): SourceRankMap {
  const rankings = {} as SourceRankMap;
  for (const domain of AUTHORITY_DOMAINS) {
    const byWeight = new Map(weights.filter((w) => w.domain === domain).map((w) => [w.source, w.weight]));
    rankings[domain] = [...SOURCE_ORDER].sort(
      (a, b) => (byWeight.get(b) ?? 0) - (byWeight.get(a) ?? 0) || SOURCE_ORDER.indexOf(a) - SOURCE_ORDER.indexOf(b),
    );
  }
  return rankings;
}

export const DEFAULT_RANKINGS: SourceRankMap = buildDefaultRankings();

export const DEFAULT_RESOLUTION_CONTEXT: ResolutionContext = { rankings: DEFAULT_RANKINGS, overrides: {} };

export function getSourceRank(rankings: SourceRankMap, domain: AuthorityDomain, source: SourceSystem): number {
  const index = rankings[domain].indexOf(source);
  return index === -1 ? rankings[domain].length + 1 : index + 1;
}

/** Moves a source up (`delta < 0`) or down (`delta > 0`) in one domain's ranking. */
export function moveSourceRank(
  rankings: SourceRankMap,
  domain: AuthorityDomain,
  source: SourceSystem,
  delta: number,
): SourceRankMap {
  const order = [...rankings[domain]];
  const from = order.indexOf(source);
  const to = Math.max(0, Math.min(order.length - 1, from + delta));
  if (from === -1 || from === to) return rankings;
  order.splice(from, 1);
  order.splice(to, 0, source);
  return { ...rankings, [domain]: order };
}

export function rankingsEqual(a: SourceRankMap, b: SourceRankMap): boolean {
  return AUTHORITY_DOMAINS.every((domain) => a[domain].join('|') === b[domain].join('|'));
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
 * Current claim of every source for every canonical field, in ranking order. A newer document
 * from the same source supersedes its older one; a `null` value retracts the source's claim.
 */
export function collectFieldClaims(
  documents: readonly ClientDocument[],
  rankings: SourceRankMap = DEFAULT_RANKINGS,
): Map<string, SourceClaim[]> {
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
              rank: getSourceRank(rankings, definition.domain, doc.source),
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

interface Resolution {
  ordered: SourceClaim[];
  rankedWinner: SourceClaim;
  override: ManualOverride | null;
}

/** An override only applies while its source still has a claim for the field. */
function resolveClaims(rankedClaims: SourceClaim[], override: ManualOverride | undefined): Resolution {
  const rankedWinner = rankedClaims[0];
  const pinned = override ? rankedClaims.find((c) => c.source === override.source) : undefined;
  if (!override || !pinned) return { ordered: rankedClaims, rankedWinner, override: null };
  return { ordered: [pinned, ...rankedClaims.filter((c) => c !== pinned)], rankedWinner, override };
}

function resolveAll(documents: readonly ClientDocument[], context: ResolutionContext): Map<string, Resolution> {
  const resolved = new Map<string, Resolution>();
  for (const [key, claims] of collectFieldClaims(documents, context.rankings)) {
    resolved.set(key, resolveClaims(claims, context.overrides[key]));
  }
  return resolved;
}

export function computeGoldenRecord(
  documents: readonly ClientDocument[],
  asOf: Date = latestTimestamp(documents),
  context: ResolutionContext = DEFAULT_RESOLUTION_CONTEXT,
): GoldenRecordEntry[] {
  const entries: GoldenRecordEntry[] = [];

  for (const [key, { ordered, override }] of resolveAll(documents, context)) {
    const definition = getFieldDefinition(key);
    const winner = ordered[0];
    entries.push({
      key,
      code: definition.code,
      label: definition.label,
      value: winner.value,
      category: definition.category,
      domain: definition.domain,
      format: definition.format,
      source: winner.source,
      rank: winner.rank,
      documentId: winner.documentId,
      createdAt: winner.timestamp,
      freshnessDays: daysBetween(winner.timestamp, asOf),
      claims: ordered,
      hasConflict: distinctValueCount(ordered) > 1,
      isOverridden: override !== null,
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

function explainResolution(resolution: Resolution, definition: FieldDefinition): string {
  const winner = resolution.ordered[0];
  const winnerName = SOURCE_LABELS[winner.source];

  if (resolution.override) {
    const ranked = resolution.rankedWinner;
    const pinnedOn = formatDate(resolution.override.createdAt);
    return ranked.source === winner.source
      ? `Pinned to ${winnerName} by an agent on ${pinnedOn}; matches the ranking winner.`
      : `Pinned to ${winnerName} (#${winner.rank}) by an agent on ${pinnedOn}. Ranking alone would pick ${SOURCE_LABELS[ranked.source]} (#${ranked.rank}).`;
  }

  const runnerUp = resolution.ordered.find((c) => !valuesEqual(c.value, winner.value)) ?? resolution.ordered[1];
  const runnerUpName = SOURCE_LABELS[runnerUp.source];
  const domain = DOMAIN_LABELS[definition.domain].toLowerCase();
  const newerBy = daysBetween(winner.timestamp, new Date(runnerUp.timestamp));
  const recency = newerBy > 0 ? `, although ${runnerUpName} is ${newerBy}d newer` : '';
  return `${winnerName} ranks #${winner.rank} for ${domain}, above ${runnerUpName} (#${runnerUp.rank})${recency}.`;
}

const SEVERITY_RANK: Record<ConflictSeverity, number> = { critical: 0, warning: 1 };

export function detectConflicts(
  documents: readonly ClientDocument[],
  context: ResolutionContext = DEFAULT_RESOLUTION_CONTEXT,
): FieldConflict[] {
  const conflicts: FieldConflict[] = [];

  for (const [key, resolution] of resolveAll(documents, context)) {
    const { ordered, rankedWinner, override } = resolution;
    if (distinctValueCount(ordered) < 2) continue;
    const definition = getFieldDefinition(key);
    const winner = ordered[0];
    const driftPct = computeDriftPct(ordered, winner.value);

    conflicts.push({
      fieldKey: key,
      code: definition.code,
      label: definition.label,
      category: definition.category,
      domain: definition.domain,
      format: definition.format,
      conflictingValues: ordered,
      resolvedValue: winner.value,
      resolvedSource: winner.source,
      rankedSource: rankedWinner.source,
      resolution: override ? 'override' : 'ranking',
      override,
      severity: classifySeverity(definition, driftPct),
      driftPct,
      rationale: explainResolution(resolution, definition),
    });
  }

  return conflicts.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || compareFieldKeys(a.fieldKey, b.fieldKey),
  );
}

/** Conflicts an agent has arbitrated do not count against health. */
export function computeHealthScore(
  goldenRecord: readonly GoldenRecordEntry[],
  conflicts: readonly FieldConflict[],
): HealthBreakdown {
  const open = conflicts.filter((c) => c.resolution === 'ranking');
  const criticalCount = open.filter((c) => c.severity === 'critical').length;
  const warningCount = open.length - criticalCount;
  const staleFields = goldenRecord.filter((e) => e.freshnessDays > STALE_AFTER_DAYS).length;
  const conflictPenalty = criticalCount * CRITICAL_PENALTY + warningCount * WARNING_PENALTY;
  const stalenessPenalty = Math.min(MAX_STALENESS_PENALTY, staleFields * STALE_FIELD_PENALTY);
  const score = goldenRecord.length === 0 ? 0 : Math.max(0, Math.min(100, 100 - conflictPenalty - stalenessPenalty));

  return {
    score,
    criticalCount,
    warningCount,
    overriddenCount: conflicts.length - open.length,
    staleFields,
    conflictPenalty,
    stalenessPenalty,
  };
}

export function buildSnapshot(
  asOf: Date,
  context: ResolutionContext = DEFAULT_RESOLUTION_CONTEXT,
  documents: readonly ClientDocument[] = CLIENT_DOCUMENTS,
): ClientSnapshot {
  const visible = getSnapshotAtDate(asOf, documents);
  const goldenRecord = computeGoldenRecord(visible, asOf, context);
  const conflicts = detectConflicts(visible, context);
  return {
    asOf: asOf.toISOString(),
    documents: visible,
    goldenRecord,
    conflicts,
    health: computeHealthScore(goldenRecord, conflicts),
  };
}

function toConflictDelta(conflict: FieldConflict): ConflictDelta {
  return { fieldKey: conflict.fieldKey, code: conflict.code, label: conflict.label, severity: conflict.severity };
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
      code: reference.code,
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

  const previousConflicts = new Map((previous?.conflicts ?? []).map((c) => [c.fieldKey, c]));
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
    conflictsOpened: current.conflicts.filter((c) => !previousConflicts.has(c.fieldKey)).map(toConflictDelta),
    conflictsEscalated: current.conflicts
      .filter((c) => c.severity === 'critical' && previousConflicts.get(c.fieldKey)?.severity === 'warning')
      .map(toConflictDelta),
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
