import type {
  AuthorityDomain,
  ClientDocument,
  ClientProfile,
  FieldDefinition,
  FieldValue,
  Milestone,
  SourceSystem,
  SystemWeight,
} from '../types';

/** Fictional client and invented data only. */
export const CLIENT_PROFILE: ClientProfile = {
  clientId: 'CL-9401',
  displayId: '#9401',
  name: 'Acme Corp',
  legalEntity: 'Acme Corporation Ltd.',
  segment: 'Enterprise',
  workLocation: 'BE',
};

/** Fixed "now" so the dataset and every derived number stay deterministic. */
export const SIMULATED_TODAY = '2025-01-20T16:30:00.000Z';

export const SOURCE_BASE_PRIORITY: Record<SourceSystem, number> = {
  PAYROLL: 100,
  HRIS: 90,
  CONTRACTS: 80,
  BENEFITS: 60,
  CRM: 50,
  SUPPORT: 30,
};

const AUTHORITY_MATRIX: Record<SourceSystem, Record<AuthorityDomain, number>> = {
  PAYROLL: { compensation: 100, headcount: 80, benefits: 70, contact: 60, company: 40, contract: 30 },
  HRIS: { headcount: 90, compensation: 70, benefits: 60, contact: 55, company: 50, contract: 30 },
  CRM: { contact: 75, company: 70, contract: 50, headcount: 30, compensation: 20, benefits: 20 },
  CONTRACTS: { contract: 95, company: 60, compensation: 60, contact: 50, benefits: 50, headcount: 20 },
  BENEFITS: { benefits: 95, compensation: 50, headcount: 40, contact: 30, company: 20, contract: 20 },
  SUPPORT: { contact: 40, company: 25, headcount: 10, compensation: 10, contract: 10, benefits: 10 },
};

export const SYSTEM_WEIGHTS: SystemWeight[] = (Object.keys(AUTHORITY_MATRIX) as SourceSystem[]).flatMap((source) =>
  (Object.entries(AUTHORITY_MATRIX[source]) as Array<[AuthorityDomain, number]>).map(([domain, weight]) => ({
    source,
    domain,
    weight,
  })),
);

/** Display order of the golden record follows this list. */
export const FIELD_DEFINITIONS: FieldDefinition[] = [
  { key: 'legalName', label: 'Legal entity name', category: 'company', domain: 'company', format: 'text', conflictSeverity: 'critical' },
  { key: 'tradingName', label: 'Trading name', category: 'company', domain: 'company', format: 'text' },
  { key: 'industry', label: 'Industry', category: 'company', domain: 'company', format: 'text' },
  { key: 'hqAddress', label: 'Headquarters address', category: 'company', domain: 'company', format: 'text', conflictSeverity: 'warning' },
  { key: 'accountTier', label: 'Account tier', category: 'company', domain: 'company', format: 'text' },

  { key: 'headcount', label: 'Headcount (active employees)', category: 'payroll', domain: 'headcount', format: 'number', criticalDriftPct: 10 },
  { key: 'payrollFrequency', label: 'Payroll frequency', category: 'payroll', domain: 'compensation', format: 'text', conflictSeverity: 'critical' },
  { key: 'payCycleCutoff', label: 'Pay cycle cut-off', category: 'payroll', domain: 'compensation', format: 'text', conflictSeverity: 'critical' },
  { key: 'annualPayrollBudget', label: 'Annual gross payroll', category: 'payroll', domain: 'compensation', format: 'currency', criticalDriftPct: 5 },
  { key: 'avgMonthlyGross', label: 'Avg. monthly gross salary', category: 'payroll', domain: 'compensation', format: 'currency', criticalDriftPct: 5 },
  { key: 'pensionProvider', label: 'Pension provider', category: 'payroll', domain: 'benefits', format: 'text' },
  { key: 'mealVoucherValue', label: 'Meal voucher (per day)', category: 'payroll', domain: 'benefits', format: 'currency' },
  { key: 'wellnessStipend', label: 'Wellness stipend (monthly)', category: 'payroll', domain: 'benefits', format: 'currency' },
  { key: 'bikeLeaseEnabled', label: 'Bike lease programme', category: 'payroll', domain: 'benefits', format: 'boolean' },

  { key: 'servicePlan', label: 'Service plan', category: 'compliance', domain: 'contract', format: 'text', conflictSeverity: 'critical' },
  { key: 'contractRenewalDate', label: 'Contract renewal date', category: 'compliance', domain: 'contract', format: 'date', conflictSeverity: 'critical' },
  { key: 'slaTier', label: 'SLA tier', category: 'compliance', domain: 'contract', format: 'text' },
  { key: 'dpaSigned', label: 'Data processing agreement', category: 'compliance', domain: 'contract', format: 'boolean', conflictSeverity: 'critical' },

  { key: 'primaryContactName', label: 'Primary contact', category: 'contacts', domain: 'contact', format: 'text' },
  { key: 'primaryContactEmail', label: 'Primary contact email', category: 'contacts', domain: 'contact', format: 'email', conflictSeverity: 'warning' },
  { key: 'billingEmail', label: 'Billing email', category: 'contacts', domain: 'contact', format: 'email', conflictSeverity: 'warning' },
  { key: 'accountManager', label: 'Account manager', category: 'contacts', domain: 'contact', format: 'text' },
];

/** Source-specific payload keys mapped onto canonical field keys. */
export const FIELD_ALIASES: Record<string, string> = {
  activePayees: 'headcount',
  employeeCount: 'headcount',
  contactEmail: 'primaryContactEmail',
  requesterEmail: 'primaryContactEmail',
};

export const MILESTONES: Milestone[] = [
  { date: '2024-01-31', label: 'Jan 2024' },
  { date: '2024-04-30', label: 'Apr 2024' },
  { date: '2024-07-31', label: 'Jul 2024' },
  { date: '2024-10-31', label: 'Oct 2024' },
  { date: SIMULATED_TODAY.slice(0, 10), label: 'Today', asOf: SIMULATED_TODAY },
];

interface DocumentSeed {
  source: SourceSystem;
  createdAt: string;
  author: string;
  title: string;
  payload: Record<string, FieldValue>;
}

const LEGACY_HQ = '14 Foundry Lane, Riverside Park, Springfield';
const NEW_HQ = 'Unit 5, Harbor Point Business Park, 220 Quay Road, Springfield';
const CRM_CONTACT_EMAIL = 'dana.whitfield@acme-corp.example';
const SUPPORT_CONTACT_EMAIL = 'd.whitfield@acmecorp.example';

const DOCUMENT_SEEDS: DocumentSeed[] = [
  {
    source: 'CONTRACTS',
    createdAt: '2024-01-08T10:00:00.000Z',
    author: 'J. Moreau (Legal Ops)',
    title: 'Master Services Agreement signed',
    payload: {
      legalName: 'Acme Corporation Ltd.',
      hqAddress: LEGACY_HQ,
      servicePlan: 'Payroll Premium',
      contractRenewalDate: '2025-12-31',
      slaTier: 'Gold',
      dpaSigned: true,
      primaryContactName: 'Dana Whitfield',
    },
  },
  {
    source: 'CRM',
    createdAt: '2024-01-10T09:15:00.000Z',
    author: 'M. Jansen (Account Mgmt)',
    title: 'Account created in CRM',
    payload: {
      tradingName: 'Acme',
      industry: 'Industrial manufacturing',
      accountTier: 'Enterprise',
      hqAddress: LEGACY_HQ,
      primaryContactName: 'Dana Whitfield',
      primaryContactEmail: CRM_CONTACT_EMAIL,
      accountManager: 'Marco Jansen',
    },
  },
  {
    source: 'HRIS',
    createdAt: '2024-01-15T08:00:00.000Z',
    author: 'HRIS nightly sync',
    title: 'Employee census import',
    payload: { headcount: 38 },
  },
  {
    source: 'BENEFITS',
    createdAt: '2024-01-20T11:30:00.000Z',
    author: 'Benefits admin portal',
    title: 'Benefits enrolment baseline',
    payload: { pensionProvider: 'Northstar Pension Fund', mealVoucherValue: 8, wellnessStipend: 30 },
  },
  {
    source: 'PAYROLL',
    createdAt: '2024-01-31T18:00:00.000Z',
    author: 'Payroll engine',
    title: 'January payroll run: 38 active payees',
    payload: {
      activePayees: 38,
      payrollFrequency: 'Monthly',
      payCycleCutoff: '20th of month',
      annualPayrollBudget: 2_150_000,
      avgMonthlyGross: 4_720,
      billingEmail: 'ap@acme-corp.example',
    },
  },
  {
    source: 'CRM',
    createdAt: '2024-03-12T14:20:00.000Z',
    author: 'M. Jansen (Account Mgmt)',
    title: 'HQ relocation logged after client call',
    payload: { hqAddress: NEW_HQ },
  },
  {
    source: 'SUPPORT',
    createdAt: '2024-03-28T10:05:00.000Z',
    author: 'Support desk · ticket SR-18233',
    title: 'Ticket: payslip portal access issue',
    payload: { requesterEmail: SUPPORT_CONTACT_EMAIL, primaryContactName: 'Dana Whitfield' },
  },
  {
    source: 'HRIS',
    createdAt: '2024-04-15T08:00:00.000Z',
    author: 'HRIS nightly sync',
    title: 'Q2 census import',
    payload: { headcount: 42 },
  },
  {
    source: 'PAYROLL',
    createdAt: '2024-04-30T18:00:00.000Z',
    author: 'Payroll engine',
    title: 'April payroll run: 44 active payees',
    payload: { activePayees: 44, annualPayrollBudget: 2_380_000, avgMonthlyGross: 4_760 },
  },
  {
    source: 'BENEFITS',
    createdAt: '2024-06-20T09:00:00.000Z',
    author: 'Benefits admin portal',
    title: 'Meal voucher value uplift',
    payload: { mealVoucherValue: 10 },
  },
  {
    source: 'SUPPORT',
    createdAt: '2024-07-02T13:40:00.000Z',
    author: 'Support desk · ticket SR-19107',
    title: 'Ticket: new starter onboarding batch',
    payload: { contactEmail: SUPPORT_CONTACT_EMAIL },
  },
  {
    source: 'HRIS',
    createdAt: '2024-07-10T08:00:00.000Z',
    author: 'HRIS nightly sync',
    title: 'Q3 census import',
    payload: { headcount: 45 },
  },
  {
    source: 'CRM',
    createdAt: '2024-07-18T15:10:00.000Z',
    author: 'M. Jansen (Account Mgmt)',
    title: 'Account tier upgraded',
    payload: { accountTier: 'Enterprise Plus' },
  },
  {
    source: 'PAYROLL',
    createdAt: '2024-07-31T18:00:00.000Z',
    author: 'Payroll engine',
    title: 'July payroll run: 52 active payees',
    payload: { activePayees: 52, annualPayrollBudget: 2_760_000, avgMonthlyGross: 4_790 },
  },
  {
    source: 'CONTRACTS',
    createdAt: '2024-09-30T11:00:00.000Z',
    author: 'J. Moreau (Legal Ops)',
    title: 'MSA amendment #1: scope extension',
    payload: {
      servicePlan: 'Payroll Premium + Time & Attendance',
      contractRenewalDate: '2026-12-31',
      slaTier: 'Platinum',
      hqAddress: LEGACY_HQ,
    },
  },
  {
    source: 'BENEFITS',
    createdAt: '2024-10-01T09:00:00.000Z',
    author: 'Benefits admin portal',
    title: 'Benefits catalogue refresh',
    payload: { wellnessStipend: null, bikeLeaseEnabled: true },
  },
  {
    source: 'HRIS',
    createdAt: '2024-10-14T08:00:00.000Z',
    author: 'HRIS nightly sync',
    title: 'Q4 census import',
    payload: { headcount: 47 },
  },
  {
    source: 'CRM',
    createdAt: '2024-10-22T10:30:00.000Z',
    author: 'CRM admin',
    title: 'Account team reassignment',
    payload: { accountManager: 'Priya Raman' },
  },
  {
    source: 'PAYROLL',
    createdAt: '2024-10-31T18:00:00.000Z',
    author: 'Payroll engine',
    title: 'October payroll run: 53 active payees',
    payload: { activePayees: 53, annualPayrollBudget: 2_840_000, avgMonthlyGross: 4_810 },
  },
  {
    source: 'SUPPORT',
    createdAt: '2025-01-09T09:20:00.000Z',
    author: 'Support desk · ticket SR-21544',
    title: 'Ticket: year-end tax forms request',
    payload: { contactEmail: SUPPORT_CONTACT_EMAIL, primaryContactName: 'Dana Whitfield' },
  },
  {
    source: 'HRIS',
    createdAt: '2025-01-13T08:00:00.000Z',
    author: 'HRIS nightly sync',
    title: 'Q1 census import',
    payload: { headcount: 48 },
  },
  {
    source: 'CRM',
    createdAt: '2025-01-16T16:45:00.000Z',
    author: 'P. Raman (Account Mgmt)',
    title: 'Billing contact updated',
    payload: { billingEmail: 'finance@acme-corp.example' },
  },
  {
    source: 'PAYROLL',
    createdAt: '2025-01-17T18:00:00.000Z',
    author: 'Payroll engine',
    title: 'January pre-run: 54 active payees',
    payload: { activePayees: 54, payrollFrequency: 'Monthly' },
  },
];

/** Assigns stable ids, per-source version numbers and base priorities to the seeds. */
export function generateClientHistory(
  seeds: readonly DocumentSeed[] = DOCUMENT_SEEDS,
  clientId: string = CLIENT_PROFILE.clientId,
): ClientDocument[] {
  const versions = new Map<SourceSystem, number>();
  const idPrefix = `DOC-${clientId.replace(/\D/g, '')}`;

  return [...seeds]
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((seed, index) => {
      const version = (versions.get(seed.source) ?? 0) + 1;
      versions.set(seed.source, version);
      return {
        id: `${idPrefix}-${String(index + 1).padStart(3, '0')}`,
        clientId,
        source: seed.source,
        sourcePriority: SOURCE_BASE_PRIORITY[seed.source],
        createdAt: seed.createdAt,
        author: seed.author,
        version,
        title: seed.title,
        payload: { ...seed.payload },
      };
    });
}

export const CLIENT_DOCUMENTS: readonly ClientDocument[] = generateClientHistory();
