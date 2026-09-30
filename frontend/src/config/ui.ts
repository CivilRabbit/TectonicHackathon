import type { AttributeCategory, DiffChangeType, SourceSystem } from '../types';

/** Source identity is carried by a small square swatch only; text stays monochrome. */
export const SOURCE_SWATCH: Record<SourceSystem, string> = {
  PAYROLL: 'bg-emerald-400',
  HRIS: 'bg-sky-400',
  CRM: 'bg-violet-400',
  CONTRACTS: 'bg-zinc-300',
  BENEFITS: 'bg-pink-400',
  SUPPORT: 'bg-orange-400',
};

export const CATEGORY_ORDER: AttributeCategory[] = ['company', 'payroll', 'compliance', 'contacts'];

export const CATEGORY_LABELS: Record<AttributeCategory, string> = {
  company: 'Company',
  payroll: 'Payroll & Headcount',
  compliance: 'Legal & Compliance',
  contacts: 'Contacts',
};

export const CHANGE_STYLES: Record<Exclude<DiffChangeType, 'unchanged'>, { prefix: string; pill: string }> = {
  added: { prefix: '+', pill: 'border-emerald-500/40 text-emerald-300' },
  modified: { prefix: '~', pill: 'border-yellow-500/40 text-yellow-200' },
  removed: { prefix: '−', pill: 'border-red-500/40 text-red-300' },
};

export function healthTextClass(score: number): string {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}
