export function OverrideBadge() {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-sm border border-sky-500/40 px-1 font-mono text-[9px] leading-[14px] text-sky-300">
      [MANUAL OVERRIDE]
    </span>
  );
}

export function ResolvedBadge() {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-sm border border-emerald-500/30 px-1 font-mono text-[9px] leading-[14px] text-emerald-300/90">
      [RESOLVED]
    </span>
  );
}
