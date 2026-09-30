import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { AttributeCategory, ConflictSeverity, DiffChangeType, SourceSystem } from '../types';

interface SourceStyle {
  dot: string;
  border: string;
  badge: string;
}

export const SOURCE_STYLES: Record<SourceSystem, SourceStyle> = {
  PAYROLL: { dot: 'bg-emerald-500', border: 'border-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  HRIS: { dot: 'bg-sky-500', border: 'border-sky-500', badge: 'bg-sky-50 text-sky-700 ring-sky-600/20' },
  CRM: { dot: 'bg-violet-500', border: 'border-violet-500', badge: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
  CONTRACTS: { dot: 'bg-slate-600', border: 'border-slate-600', badge: 'bg-slate-100 text-slate-700 ring-slate-500/20' },
  BENEFITS: { dot: 'bg-pink-500', border: 'border-pink-500', badge: 'bg-pink-50 text-pink-700 ring-pink-600/20' },
  SUPPORT: { dot: 'bg-orange-500', border: 'border-orange-500', badge: 'bg-orange-50 text-orange-700 ring-orange-600/20' },
};

export const CATEGORY_ORDER: AttributeCategory[] = ['company', 'payroll', 'compliance', 'contacts'];

export const CATEGORY_META: Record<AttributeCategory, { label: string; icon: LucideIcon }> = {
  company: { label: 'Company Info', icon: Building2 },
  payroll: { label: 'Payroll & Headcount', icon: Wallet },
  compliance: { label: 'Legal & Compliance', icon: ShieldCheck },
  contacts: { label: 'Contacts', icon: Users },
};

interface SeverityStyle {
  label: string;
  icon: LucideIcon;
  pill: string;
  accentBorder: string;
  text: string;
}

export const SEVERITY_STYLES: Record<ConflictSeverity, SeverityStyle> = {
  critical: {
    label: 'Critical',
    icon: AlertOctagon,
    pill: 'bg-red-50 text-red-700 ring-red-600/20',
    accentBorder: 'border-l-red-500',
    text: 'text-red-600',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    pill: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    accentBorder: 'border-l-amber-400',
    text: 'text-amber-600',
  },
};

export const CHANGE_STYLES: Record<DiffChangeType, { label: string; badge: string; dot: string }> = {
  added: { label: 'Added', badge: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20', dot: 'bg-emerald-500' },
  modified: { label: 'Modified', badge: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20', dot: 'bg-yellow-500' },
  removed: { label: 'Removed', badge: 'bg-red-100 text-red-700 ring-red-600/20', dot: 'bg-red-500' },
  unchanged: { label: 'Unchanged', badge: 'bg-slate-100 text-slate-600 ring-slate-500/20', dot: 'bg-slate-400' },
};

export function healthTone(score: number): { label: string; stroke: string; text: string } {
  if (score >= 85) return { label: 'Healthy', stroke: 'stroke-emerald-400', text: 'text-emerald-300' };
  if (score >= 60) return { label: 'Fair', stroke: 'stroke-amber-400', text: 'text-amber-300' };
  return { label: 'At risk', stroke: 'stroke-red-400', text: 'text-red-300' };
}
