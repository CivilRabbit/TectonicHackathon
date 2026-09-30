export type SourceSystem = 'PAYROLL' | 'HRIS' | 'CRM' | 'CONTRACTS' | 'BENEFITS' | 'SUPPORT';

export type AttributeCategory = 'company' | 'payroll' | 'compliance' | 'contacts';

/** Business domain a field belongs to; source rankings are defined per domain. */
export type AuthorityDomain = 'company' | 'headcount' | 'compensation' | 'contract' | 'contact' | 'benefits';

export type ValueFormat = 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'email';

export type ConflictSeverity = 'critical' | 'warning';

/** `null` in a document payload retracts that source's previous claim for the field. */
export type FieldValue = string | number | boolean | null;

/** Seed authority weight, only used to derive the default ordinal rankings. */
export interface SystemWeight {
  source: SourceSystem;
  domain: AuthorityDomain;
  weight: number;
}

/** Ordered sources per domain; index 0 is rank #1 (highest authority). */
export type SourceRankMap = Record<AuthorityDomain, SourceSystem[]>;

/** Agent decision that a specific source wins a field, regardless of ranking. */
export interface ManualOverride {
  fieldKey: string;
  source: SourceSystem;
  documentId: string;
  createdAt: string;
}

export type ManualOverrideMap = Record<string, ManualOverride>;

export type ResolutionMethod = 'ranking' | 'override';

/**
 * Agent sign-off on one specific conflict. `conflictId` covers the exact set of competing
 * documents, so new evidence for the field produces a new, unresolved conflict.
 */
export interface ResolvedConflict {
  conflictId: string;
  fieldKey: string;
  winningSource: SourceSystem;
  resolvedValue: FieldValue;
  resolvedAt: string;
  documentId: string;
  /** How the winner was chosen at the moment of resolution. */
  method: ResolutionMethod | 'document';
  /** As-of instant of the snapshot the agent was viewing. */
  snapshotAsOf: string;
}

export type ResolvedConflictMap = Record<string, ResolvedConflict>;

export interface ResolutionContext {
  rankings: SourceRankMap;
  overrides: ManualOverrideMap;
  resolutions: ResolvedConflictMap;
}

export interface FieldDefinition {
  key: string;
  /** Short uppercase code used in dense views such as the change feed. */
  code: string;
  label: string;
  category: AttributeCategory;
  domain: AuthorityDomain;
  format: ValueFormat;
  /** Severity for non-numeric conflicts. Defaults to `warning`. */
  conflictSeverity?: ConflictSeverity;
  /** Numeric drift (percent of the resolved value) at which a conflict becomes critical. Defaults to 10. */
  criticalDriftPct?: number;
}

export interface DocumentMetadata {
  id: string;
  clientId: string;
  source: SourceSystem;
  sourcePriority: number;
  createdAt: string;
  author: string;
  version: number;
  title: string;
}

export interface ClientDocument extends DocumentMetadata {
  payload: Record<string, FieldValue>;
}

export interface ClientAttribute {
  key: string;
  label: string;
  value: FieldValue;
  category: AttributeCategory;
}

export interface GoldenRecordEntry extends ClientAttribute {
  code: string;
  domain: AuthorityDomain;
  format: ValueFormat;
  source: SourceSystem;
  rank: number;
  documentId: string;
  createdAt: string;
  /** Age of the winning record, measured against the snapshot's as-of date. */
  freshnessDays: number;
  /** Claims in resolution order; the first one is the winner. */
  claims: SourceClaim[];
  hasConflict: boolean;
  isOverridden: boolean;
  isResolved: boolean;
}

export interface SourceClaim {
  source: SourceSystem;
  value: FieldValue;
  timestamp: string;
  rank: number;
  documentId: string;
  author: string;
  version: number;
  /** Raw payload key as reported by the source system, before canonicalisation. */
  sourceField: string;
}

export type ConflictStatus = 'active' | 'resolved';

export interface FieldConflict {
  conflictId: string;
  status: ConflictStatus;
  resolvedRecord: ResolvedConflict | null;
  fieldKey: string;
  code: string;
  label: string;
  category: AttributeCategory;
  domain: AuthorityDomain;
  format: ValueFormat;
  /** Sorted by resolution order: the first entry is the winner. */
  conflictingValues: SourceClaim[];
  resolvedValue: FieldValue;
  resolvedSource: SourceSystem;
  /** Source the ranking alone would pick. */
  rankedSource: SourceSystem;
  method: ResolutionMethod;
  override: ManualOverride | null;
  severity: ConflictSeverity;
  driftPct: number | null;
  rationale: string;
}

export type DiffChangeType = 'added' | 'modified' | 'removed' | 'unchanged';

export interface FieldChange {
  fieldKey: string;
  code: string;
  label: string;
  category: AttributeCategory;
  format: ValueFormat;
  type: DiffChangeType;
  previousValue: FieldValue;
  currentValue: FieldValue;
  previousSource: SourceSystem | null;
  currentSource: SourceSystem | null;
}

export interface ConflictDelta {
  fieldKey: string;
  code: string;
  label: string;
  severity: ConflictSeverity;
}

export interface SnapshotDiff {
  fromDate: string | null;
  toDate: string;
  changes: FieldChange[];
  added: FieldChange[];
  modified: FieldChange[];
  removed: FieldChange[];
  unchanged: FieldChange[];
  conflictsOpened: ConflictDelta[];
  conflictsEscalated: ConflictDelta[];
  conflictsResolved: ConflictDelta[];
  ingestedDocuments: ClientDocument[];
}

export interface HealthBreakdown {
  score: number;
  /** Active (unresolved) conflicts only. */
  criticalCount: number;
  warningCount: number;
  resolvedCount: number;
  staleFields: number;
  conflictPenalty: number;
  stalenessPenalty: number;
}

export interface ClientSnapshot {
  asOf: string;
  documents: ClientDocument[];
  goldenRecord: GoldenRecordEntry[];
  conflicts: FieldConflict[];
  health: HealthBreakdown;
}

export interface Milestone {
  /** UTC day, `YYYY-MM-DD`. */
  date: string;
  label: string;
  /** Exact as-of instant; defaults to the end of the UTC day. */
  asOf?: string;
}

export interface TimelinePoint {
  id: string;
  dayKey: string;
  asOf: string;
  milestone: string | null;
  documents: ClientDocument[];
}

export interface ClientProfile {
  clientId: string;
  displayId: string;
  name: string;
  legalEntity: string;
  segment: string;
  workLocation: string;
}

/** Open state of the side-by-side document inspector. */
export interface DocumentInspectionState {
  fieldKey: string;
  leftDocumentId: string;
  rightDocumentId: string;
}

/** Open state of the hierarchy manager; `baseline` is the ranking when it was opened. */
export interface HierarchyManagerState {
  domain: AuthorityDomain;
  baseline: SourceRankMap;
}

export interface RankingImpact {
  fieldKey: string;
  code: string;
  label: string;
  format: ValueFormat;
  previousValue: FieldValue;
  previousSource: SourceSystem;
  nextValue: FieldValue;
  nextSource: SourceSystem;
}
