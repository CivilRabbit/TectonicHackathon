import { healthTone } from '../../config/ui';
import { cn } from '../../lib/cn';

export function HealthRing({ score, size = 40 }: { score: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = healthTone(score);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-700" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className={cn('transition-[stroke-dashoffset] duration-500 ease-out', tone.stroke)}
        />
      </svg>
      <span className={cn('absolute inset-0 grid place-items-center font-mono text-[11px] font-bold', tone.text)}>
        {score}
      </span>
    </div>
  );
}
