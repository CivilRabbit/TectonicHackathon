export type SourceType = "doc" | "teams" | "email";
export type Country = "BE" | "NL" | "ALL";
export type ViewerCountry = "BE" | "NL";
export type EdgeType = "supersedes" | "contradicts" | "references";
export type ConflictReason =
  | "value_mismatch"
  | "scope_mismatch"
  | "unofficial_vs_official";
export type Severity = "high" | "medium" | "low";

export interface Claim {
  topic: string;
  value: string;
}

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  date: string;
  owner: string | null;
  country: Country;
  body?: string;
  claims: Claim[];
  supersedesIds?: string[];
  referencesIds?: string[];
}

export type SourceCreate = Omit<Source, "id">;

export interface Edge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
}

export interface Conflict {
  id: string;
  sourceIds: [string, string] | string[];
  topic: string;
  reason: ConflictReason;
  severity: Severity;
}

export interface TrustFactor {
  id: string;
  label: string;
  delta: number;
  detail: string;
}

export interface TrustBreakdown {
  score: number;
  factors: TrustFactor[];
}

export interface GraphResponse {
  country: ViewerCountry;
  nodes: Source[];
  edges: Edge[];
  conflicts: Conflict[];
  trust: Record<string, TrustBreakdown>;
}

export interface TrustChange {
  before: number;
  after: number;
}

export interface GraphDiff {
  addedNodes: Source[];
  addedEdges: Edge[];
  newConflicts: Conflict[];
  resolvedConflicts: Conflict[];
  changedTrust: Record<string, TrustChange>;
}

export interface AddSourceResponse {
  source: Source;
  diff: GraphDiff;
  graph: GraphResponse;
}

export interface SourceDetail {
  source: Source;
  trust: TrustBreakdown;
  scopeMatch: boolean;
}

export interface UserContext {
  country: ViewerCountry;
}
