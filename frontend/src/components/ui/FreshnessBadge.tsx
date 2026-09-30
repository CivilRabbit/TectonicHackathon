import { Clock } from 'lucide-react';
import { cn } from '../../lib/cn';
import { STALE_AFTER_DAYS } from '../../utils/engine';
import { formatAgo } from '../../utils/format';

export function FreshnessBadge({ days }: { days: number }) {
  const tone =
    days <= 30
      ? 'text-emerald-700 bg-emerald-50'
      : days <= STALE_AFTER_DAYS
        ? 'text-slate-600 bg-slate-100'
        : 'text-amber-700 bg-amber-50';

  return (
    <span
      title={days > STALE_AFTER_DAYS ? `Stale: older than ${STALE_AFTER_DAYS} days at this point in time` : `${days} days old`}
      className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium', tone)}
    >
      <Clock className="h-2.5 w-2.5" />
      {formatAgo(days)}
      {days > STALE_AFTER_DAYS && <span className="font-semibold">· stale</span>}
    </span>
  );
}
