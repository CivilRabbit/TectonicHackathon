import type { AuthorityDomain, SourceSystem } from '../types';

export const SOURCE_ORDER: SourceSystem[] = ['PAYROLL', 'HRIS', 'CRM', 'CONTRACTS', 'BENEFITS', 'SUPPORT'];

export const SOURCE_LABELS: Record<SourceSystem, string> = {
  PAYROLL: 'Payroll',
  HRIS: 'HRIS',
  CRM: 'CRM',
  CONTRACTS: 'Contracts',
  BENEFITS: 'Benefits',
  SUPPORT: 'Support desk',
};

export const DOMAIN_LABELS: Record<AuthorityDomain, string> = {
  company: 'Company master data',
  headcount: 'Headcount',
  compensation: 'Compensation',
  contract: 'Contract terms',
  contact: 'Contact details',
  benefits: 'Benefits',
};
