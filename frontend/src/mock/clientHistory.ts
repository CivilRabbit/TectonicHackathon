import type {
  AuthorityDomain,
  ChatLine,
  ClientDocument,
  ClientProfile,
  FieldDefinition,
  FieldValue,
  IngestedSource,
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
  { key: 'legalName', code: 'LEGAL_NAME', label: 'Legal entity name', category: 'company', domain: 'company', format: 'text', conflictSeverity: 'critical' },
  { key: 'tradingName', code: 'TRADING_NAME', label: 'Trading name', category: 'company', domain: 'company', format: 'text' },
  { key: 'industry', code: 'INDUSTRY', label: 'Industry', category: 'company', domain: 'company', format: 'text' },
  { key: 'hqAddress', code: 'HQ_ADDR', label: 'Headquarters address', category: 'company', domain: 'company', format: 'text', conflictSeverity: 'warning' },
  { key: 'accountTier', code: 'ACCT_TIER', label: 'Account tier', category: 'company', domain: 'company', format: 'text' },

  { key: 'headcount', code: 'HEADCOUNT', label: 'Headcount (active employees)', category: 'payroll', domain: 'headcount', format: 'number', criticalDriftPct: 10 },
  { key: 'payrollFrequency', code: 'PAY_FREQ', label: 'Payroll frequency', category: 'payroll', domain: 'compensation', format: 'text', conflictSeverity: 'critical' },
  { key: 'payCycleCutoff', code: 'PAY_CUTOFF', label: 'Pay cycle cut-off', category: 'payroll', domain: 'compensation', format: 'text', conflictSeverity: 'critical' },
  { key: 'annualPayrollBudget', code: 'ANNUAL_GROSS', label: 'Annual gross payroll', category: 'payroll', domain: 'compensation', format: 'currency', criticalDriftPct: 5 },
  { key: 'avgMonthlyGross', code: 'AVG_GROSS', label: 'Avg. monthly gross salary', category: 'payroll', domain: 'compensation', format: 'currency', criticalDriftPct: 5 },
  { key: 'pensionProvider', code: 'PENSION', label: 'Pension provider', category: 'payroll', domain: 'benefits', format: 'text' },
  { key: 'mealVoucherValue', code: 'MEAL_VOUCHER', label: 'Meal voucher (per day)', category: 'payroll', domain: 'benefits', format: 'currency' },
  { key: 'wellnessStipend', code: 'WELLNESS', label: 'Wellness stipend (monthly)', category: 'payroll', domain: 'benefits', format: 'currency' },
  { key: 'bikeLeaseEnabled', code: 'BIKE_LEASE', label: 'Bike lease programme', category: 'payroll', domain: 'benefits', format: 'boolean' },

  { key: 'servicePlan', code: 'SERVICE_PLAN', label: 'Service plan', category: 'compliance', domain: 'contract', format: 'text', conflictSeverity: 'critical' },
  { key: 'contractRenewalDate', code: 'RENEWAL', label: 'Contract renewal date', category: 'compliance', domain: 'contract', format: 'date', conflictSeverity: 'critical' },
  { key: 'slaTier', code: 'SLA', label: 'SLA tier', category: 'compliance', domain: 'contract', format: 'text' },
  { key: 'dpaSigned', code: 'DPA', label: 'Data processing agreement', category: 'compliance', domain: 'contract', format: 'boolean', conflictSeverity: 'critical' },

  { key: 'primaryContactName', code: 'CONTACT', label: 'Primary contact', category: 'contacts', domain: 'contact', format: 'text' },
  { key: 'primaryContactEmail', code: 'CONTACT_EMAIL', label: 'Primary contact email', category: 'contacts', domain: 'contact', format: 'email', conflictSeverity: 'warning' },
  { key: 'billingEmail', code: 'BILLING_EMAIL', label: 'Billing email', category: 'contacts', domain: 'contact', format: 'email', conflictSeverity: 'warning' },
  { key: 'accountManager', code: 'ACCT_MGR', label: 'Account manager', category: 'contacts', domain: 'contact', format: 'text' },
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

const KNOWLEDGE_INBOX = {
  toName: 'Northwind Knowledge',
  toAddress: 'knowledge@northwind.example',
};

type OriginDraft =
  | { kind: 'email'; fromName: string; fromAddress: string; body: string }
  | { kind: 'chat'; channel: string; messages: ChatLine[] }
  | { kind: 'document'; documentType: string; reference: string; body: string };

interface DocumentSeed {
  source: SourceSystem;
  createdAt: string;
  author: string;
  title: string;
  payload: Record<string, FieldValue>;
  origin: OriginDraft;
}

function toIngestedSource(title: string, draft: OriginDraft): IngestedSource {
  if (draft.kind === 'email') {
    return {
      kind: 'email',
      ...KNOWLEDGE_INBOX,
      fromName: draft.fromName,
      fromAddress: draft.fromAddress,
      subject: title,
      body: draft.body,
    };
  }
  if (draft.kind === 'chat') {
    return { kind: 'chat', channel: draft.channel, thread: title, messages: draft.messages };
  }
  return {
    kind: 'document',
    title,
    documentType: draft.documentType,
    reference: draft.reference,
    body: draft.body,
  };
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
    origin: {
      kind: 'document',
      documentType: 'Contract',
      reference: 'MSA-ACME-2024',
      body: `Northwind People — Master Services Agreement

Invented contract of record for Acme Corporation Ltd. Filed by J. Moreau, Legal Ops.

Legal entity: Acme Corporation Ltd.
Headquarters: ${LEGACY_HQ}
Service plan: Payroll Premium
Contract renewal: 31 December 2025
SLA tier: Gold
Data processing agreement: signed
Primary contact: Dana Whitfield`,
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
    origin: {
      kind: 'email',
      fromName: 'Marco Jansen',
      fromAddress: 'm.jansen@accounts.northwind.example',
      body: `Acme is now live in the CRM. Logging the account as opened today.

Trading name: Acme
Industry: Industrial manufacturing
Account tier: Enterprise
Headquarters: ${LEGACY_HQ}
Primary contact: Dana Whitfield (${CRM_CONTACT_EMAIL})
Account manager: Marco Jansen

Marco Jansen
Account Management`,
    },
  },
  {
    source: 'HRIS',
    createdAt: '2024-01-15T08:00:00.000Z',
    author: 'HRIS nightly sync',
    title: 'Employee census import',
    payload: { headcount: 38 },
    origin: {
      kind: 'document',
      documentType: 'System export',
      reference: 'HRIS-CENSUS-2024-01',
      body: `Employee census export — Acme Corp

Active employees (headcount): 38

Generated by the HRIS nightly sync. No manual edits were applied.`,
    },
  },
  {
    source: 'BENEFITS',
    createdAt: '2024-01-20T11:30:00.000Z',
    author: 'Benefits admin portal',
    title: 'Benefits enrolment baseline',
    payload: { pensionProvider: 'Northstar Pension Fund', mealVoucherValue: 8, wellnessStipend: 30 },
    origin: {
      kind: 'document',
      documentType: 'Enrolment record',
      reference: 'BEN-ENROL-2024-01',
      body: `Benefits enrolment baseline — Acme Corp

Pension provider: Northstar Pension Fund
Meal voucher: EUR 8 per day
Wellness stipend: EUR 30 per month

Confirmed in the benefits admin portal.`,
    },
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
    origin: {
      kind: 'document',
      documentType: 'Payroll report',
      reference: 'PAY-RUN-2024-01',
      body: `January payroll run — Acme Corp

Active payees: 38
Payroll frequency: Monthly
Pay cycle cut-off: 20th of month
Annual gross payroll: EUR 2,150,000
Average monthly gross salary: EUR 4,720
Billing email: ap@acme-corp.example

Closed by the payroll engine.`,
    },
  },
  {
    source: 'CRM',
    createdAt: '2024-03-12T14:20:00.000Z',
    author: 'M. Jansen (Account Mgmt)',
    title: 'HQ relocation logged after client call',
    payload: { hqAddress: NEW_HQ },
    origin: {
      kind: 'email',
      fromName: 'Marco Jansen',
      fromAddress: 'm.jansen@accounts.northwind.example',
      body: `Dana called this afternoon. Acme has moved headquarters.

New headquarters address: ${NEW_HQ}

Please update the account. The previous Foundry Lane address is no longer current.

Marco Jansen
Account Management`,
    },
  },
  {
    source: 'SUPPORT',
    createdAt: '2024-03-28T10:05:00.000Z',
    author: 'Support desk · ticket SR-18233',
    title: 'Ticket: payslip portal access issue',
    payload: { requesterEmail: SUPPORT_CONTACT_EMAIL, primaryContactName: 'Dana Whitfield' },
    origin: {
      kind: 'chat',
      channel: '#acme-support',
      messages: [
        {
          author: 'Dana Whitfield',
          at: '10:02',
          body: `Can't sign in to the payslip portal. Please use ${SUPPORT_CONTACT_EMAIL} if you need to reach me.`,
        },
        {
          author: 'Support desk',
          at: '10:05',
          body: `Ticket SR-18233. Access restored the same morning. Treating Dana Whitfield (${SUPPORT_CONTACT_EMAIL}) as the primary contact on the account.`,
        },
      ],
    },
  },
  {
    source: 'HRIS',
    createdAt: '2024-04-15T08:00:00.000Z',
    author: 'HRIS nightly sync',
    title: 'Q2 census import',
    payload: { headcount: 42 },
    origin: {
      kind: 'chat',
      channel: '#people-ops',
      messages: [
        {
          author: 'HRIS nightly sync',
          at: '08:00',
          body: `Q2 census for Acme Corp is in. Active employees (headcount): 42. System post — no manual edits.`,
        },
      ],
    },
  },
  {
    source: 'PAYROLL',
    createdAt: '2024-04-30T18:00:00.000Z',
    author: 'Payroll engine',
    title: 'April payroll run: 44 active payees',
    payload: { activePayees: 44, annualPayrollBudget: 2_380_000, avgMonthlyGross: 4_760 },
    origin: {
      kind: 'document',
      documentType: 'Payroll report',
      reference: 'PAY-RUN-2024-04',
      body: `April payroll run — Acme Corp

Active payees: 44
Annual gross payroll: EUR 2,380,000
Average monthly gross salary: EUR 4,760

Closed by the payroll engine.`,
    },
  },
  {
    source: 'BENEFITS',
    createdAt: '2024-06-20T09:00:00.000Z',
    author: 'Benefits admin portal',
    title: 'Meal voucher value uplift',
    payload: { mealVoucherValue: 10 },
    origin: {
      kind: 'chat',
      channel: '#benefits',
      messages: [
        {
          author: 'Benefits admin',
          at: '09:00',
          body: 'June catalogue is live for Acme Corp. Meal voucher moves to EUR 10 per day. Other benefits stay as they are.',
        },
        {
          author: 'Lina Vos',
          at: '09:14',
          body: 'Noted. I will mirror EUR 10 into the enrolment record.',
        },
      ],
    },
  },
  {
    source: 'SUPPORT',
    createdAt: '2024-07-02T13:40:00.000Z',
    author: 'Support desk · ticket SR-19107',
    title: 'Ticket: new starter onboarding batch',
    payload: { contactEmail: SUPPORT_CONTACT_EMAIL },
    origin: {
      kind: 'chat',
      channel: '#acme-support',
      messages: [
        {
          author: 'Support desk',
          at: '13:40',
          body: `Ticket SR-19107 — new starter onboarding batch. Filed under ${SUPPORT_CONTACT_EMAIL}.`,
        },
        {
          author: 'N. Patel',
          at: '13:52',
          body: `That is Dana Whitfield's alternate address. Keep ${SUPPORT_CONTACT_EMAIL} on the contact record.`,
        },
      ],
    },
  },
  {
    source: 'HRIS',
    createdAt: '2024-07-10T08:00:00.000Z',
    author: 'HRIS nightly sync',
    title: 'Q3 census import',
    payload: { headcount: 45 },
    origin: {
      kind: 'document',
      documentType: 'System export',
      reference: 'HRIS-CENSUS-2024-07',
      body: `Employee census export — Acme Corp

Active employees (headcount): 45

Generated by the HRIS nightly sync. No manual edits were applied.`,
    },
  },
  {
    source: 'CRM',
    createdAt: '2024-07-18T15:10:00.000Z',
    author: 'M. Jansen (Account Mgmt)',
    title: 'Account tier upgraded',
    payload: { accountTier: 'Enterprise Plus' },
    origin: {
      kind: 'email',
      fromName: 'Marco Jansen',
      fromAddress: 'm.jansen@accounts.northwind.example',
      body: `Acme qualifies for the higher tier after the Q3 headcount review.

Account tier: Enterprise Plus

Marco Jansen
Account Management`,
    },
  },
  {
    source: 'PAYROLL',
    createdAt: '2024-07-31T18:00:00.000Z',
    author: 'Payroll engine',
    title: 'July payroll run: 52 active payees',
    payload: { activePayees: 52, annualPayrollBudget: 2_760_000, avgMonthlyGross: 4_790 },
    origin: {
      kind: 'chat',
      channel: '#payroll-runs',
      messages: [
        {
          author: 'Payroll engine',
          at: '18:00',
          body: 'July payroll run for Acme Corp has closed. Active payees: 52. Annual gross payroll: EUR 2,760,000. Average monthly gross salary: EUR 4,790.',
        },
      ],
    },
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
    origin: {
      kind: 'document',
      documentType: 'Contract amendment',
      reference: 'MSA-ACME-2024-A1',
      body: `Amendment #1 — Master Services Agreement, Acme Corp

Filed as written by J. Moreau, Legal Ops. The amendment still lists the Foundry Lane address.

Service plan: Payroll Premium + Time & Attendance
Contract renewal: 31 December 2026
SLA tier: Platinum
Headquarters: ${LEGACY_HQ}`,
    },
  },
  {
    source: 'BENEFITS',
    createdAt: '2024-10-01T09:00:00.000Z',
    author: 'Benefits admin portal',
    title: 'Benefits catalogue refresh',
    payload: { wellnessStipend: null, bikeLeaseEnabled: true },
    origin: {
      kind: 'document',
      documentType: 'Catalogue',
      reference: 'BEN-CAT-2024-10',
      body: `Benefits catalogue refresh — Acme Corp

Wellness stipend: withdrawn
Bike lease programme: enabled

The monthly wellness stipend is no longer offered. The bike lease replaces it.`,
    },
  },
  {
    source: 'HRIS',
    createdAt: '2024-10-14T08:00:00.000Z',
    author: 'HRIS nightly sync',
    title: 'Q4 census import',
    payload: { headcount: 47 },
    origin: {
      kind: 'document',
      documentType: 'System export',
      reference: 'HRIS-CENSUS-2024-10',
      body: `Employee census export — Acme Corp

Active employees (headcount): 47

Generated by the HRIS nightly sync. No manual edits were applied.`,
    },
  },
  {
    source: 'CRM',
    createdAt: '2024-10-22T10:30:00.000Z',
    author: 'CRM admin',
    title: 'Account team reassignment',
    payload: { accountManager: 'Priya Raman' },
    origin: {
      kind: 'chat',
      channel: '#accounts',
      messages: [
        {
          author: 'CRM admin',
          at: '10:30',
          body: 'Account team change for Acme Corp. Account manager is now Priya Raman. Marco Jansen stays on the history.',
        },
        {
          author: 'Priya Raman',
          at: '10:41',
          body: 'Taking the account from today.',
        },
      ],
    },
  },
  {
    source: 'PAYROLL',
    createdAt: '2024-10-31T18:00:00.000Z',
    author: 'Payroll engine',
    title: 'October payroll run: 53 active payees',
    payload: { activePayees: 53, annualPayrollBudget: 2_840_000, avgMonthlyGross: 4_810 },
    origin: {
      kind: 'document',
      documentType: 'Payroll report',
      reference: 'PAY-RUN-2024-10',
      body: `October payroll run — Acme Corp

Active payees: 53
Annual gross payroll: EUR 2,840,000
Average monthly gross salary: EUR 4,810

Closed by the payroll engine.`,
    },
  },
  {
    source: 'SUPPORT',
    createdAt: '2025-01-09T09:20:00.000Z',
    author: 'Support desk · ticket SR-21544',
    title: 'Ticket: year-end tax forms request',
    payload: { contactEmail: SUPPORT_CONTACT_EMAIL, primaryContactName: 'Dana Whitfield' },
    origin: {
      kind: 'email',
      fromName: 'Support desk',
      fromAddress: 'support-desk@northwind.example',
      body: `Ticket SR-21544 — year-end tax forms.

Primary contact: Dana Whitfield
Contact email: ${SUPPORT_CONTACT_EMAIL}

She asked for the 2024 tax pack to be sent to the address above.

Support desk`,
    },
  },
  {
    source: 'HRIS',
    createdAt: '2025-01-13T08:00:00.000Z',
    author: 'HRIS nightly sync',
    title: 'Q1 census import',
    payload: { headcount: 48 },
    origin: {
      kind: 'document',
      documentType: 'System export',
      reference: 'HRIS-CENSUS-2025-01',
      body: `Employee census export — Acme Corp

Active employees (headcount): 48

Generated by the HRIS nightly sync. No manual edits were applied.`,
    },
  },
  {
    source: 'CRM',
    createdAt: '2025-01-16T16:45:00.000Z',
    author: 'P. Raman (Account Mgmt)',
    title: 'Billing contact updated',
    payload: { billingEmail: 'finance@acme-corp.example' },
    origin: {
      kind: 'email',
      fromName: 'Priya Raman',
      fromAddress: 'p.raman@accounts.northwind.example',
      body: `Acme asked us to change the billing contact.

Billing email: finance@acme-corp.example

The previous ap@ address should no longer be used for invoices.

Priya Raman
Account Management`,
    },
  },
  {
    source: 'PAYROLL',
    createdAt: '2025-01-17T18:00:00.000Z',
    author: 'Payroll engine',
    title: 'January pre-run: 54 active payees',
    payload: { activePayees: 54, payrollFrequency: 'Monthly' },
    origin: {
      kind: 'document',
      documentType: 'Payroll report',
      reference: 'PAY-PRERUN-2025-01',
      body: `January pre-run — Acme Corp

Active payees: 54
Payroll frequency: Monthly

This is a pre-run, not the closed January payroll.`,
    },
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
        origin: toIngestedSource(seed.title, seed.origin),
      };
    });
}

export const CLIENT_DOCUMENTS: readonly ClientDocument[] = generateClientHistory();
