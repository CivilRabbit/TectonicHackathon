import type { FieldValue, ValueFormat } from '../types';

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat('en-GB');
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const shortDateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

export function formatValue(value: FieldValue | undefined, format: ValueFormat): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (format) {
    case 'currency':
      return typeof value === 'number' ? currencyFormatter.format(value) : String(value);
    case 'number':
      return typeof value === 'number' ? numberFormatter.format(value) : String(value);
    case 'date':
      return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? formatDate(value) : String(value);
    case 'boolean':
      if (value === true) return 'Yes';
      if (value === false) return 'No';
      return String(value);
    case 'email':
    case 'text':
      return String(value);
  }
}

export function formatSignedDelta(delta: number, format: ValueFormat): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  const magnitude = Math.abs(delta);
  return `${sign}${format === 'currency' ? currencyFormatter.format(magnitude) : numberFormatter.format(magnitude)}`;
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatShortDate(iso: string): string {
  return shortDateFormatter.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${dateTimeFormatter.format(new Date(iso))} UTC`;
}

export function formatAge(days: number): string {
  if (days < 60) return `${days}d`;
  if (days < 730) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export function formatAgo(days: number): string {
  return days === 0 ? 'same day' : `${formatAge(days)} ago`;
}
