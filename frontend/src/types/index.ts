export type SourceSystem = 'PAYROLL' | 'HRIS' | 'CRM' | 'CONTRACTS' | 'BENEFITS' | 'SUPPORT';

export type AttributeCategory = 'company' | 'payroll' | 'compliance' | 'contacts';

/** Business domain a field belongs to; authority weights are defined per (source, domain). */
export type AuthorityDomain = 'company' | 'headcount' | 'compensation' | 'contract' | 'contact' | 'benefits';

export type ValueFormat = 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'email';

export type ConflictSeverity = 'critical' | 'warning';

/** `null` in a document payload retracts that source's previous claim for the field. */
export type FieldValue = string | number | boolean | null;

export interface SystemWeight {
  source: SourceSystem;
  domain: AuthorityDomain;
  weight: number;
}

export interface FieldDefinition {
  key: string;
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

/** How a timeline point arrived: mail, a company chat, or a text document. */
export type SourceKind = 'email' | 'chat' | 'document';

export interface EmailSource {
  kind: 'email';
  fromName: string;
  fromAddress: string;
  toName: string;
  toAddress: string;
  subject: string;
  body: string;
}

export interface ChatLine {
  author: string;
  at: string;
  body: string;
}

export interface ChatSource {
  kind: 'chat';
  channel: string;
  thread: string;
  messages: ChatLine[];
}

export interface TextDocumentSource {
  kind: 'document';
  title: string;
  documentType: string;
  reference: string;
  body: string;
}

export type IngestedSource = EmailSource | ChatSource | TextDocumentSource;

export interface ClientDocument extends DocumentMetadata {
  payload: Record<string, FieldValue>;
  origin: IngestedSource;
}

export interface ClientAttribute {
  key: string;
  label: string;
  value: FieldValue;
  category: AttributeCategory;
}

export interface GoldenRecordEntry extends ClientAttribute {
  domain: AuthorityDomain;
  format: ValueFormat;
  source: SourceSystem;
  priority: number;
  documentId: string;
  createdAt: string;
  /** Age of the winning record, measured against the snapshot's as-of date. */
  freshnessDays: number;
  contributingSources: SourceSystem[];
  hasConflict: boolean;
}

export interface SourceClaim {
  source: SourceSystem;
  value: FieldValue;
  timestamp: string;
  priority: number;
  documentId: string;
  author: string;
  version: number;
  /** Raw payload key as reported by the source system, before canonicalisation. */
  sourceField: string;
}

export interface FieldConflict {
  fieldKey: string;
  label: string;
  category: AttributeCategory;
  domain: AuthorityDomain;
  format: ValueFormat;
  /** Sorted by resolution order: the first entry is the winner. */
  conflictingValues: SourceClaim[];
  resolvedValue: FieldValue;
  resolvedSource: SourceSystem;
  severity: ConflictSeverity;
  driftPct: number | null;
  rationale: string;
}

export type DiffChangeType = 'added' | 'modified' | 'removed' | 'unchanged';

export interface FieldChange {
  fieldKey: string;
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
  conflictsResolved: ConflictDelta[];
  ingestedDocuments: ClientDocument[];
}

export interface HealthBreakdown {
  score: number;
  criticalCount: number;
  warningCount: number;
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
