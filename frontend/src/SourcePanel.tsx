import type { Conflict, Source, TrustBreakdown } from "./types";

const REASON: Record<string, string> = {
  unofficial_vs_official: "Unofficial source contradicts an official document",
  value_mismatch: "Same topic, different value, no supersedes link",
  scope_mismatch: "This source is written for another country",
};

export function SourcePanel({
  source,
  trust,
  conflicts,
  onClose,
}: {
  source: Source;
  trust: TrustBreakdown | undefined;
  conflicts: Conflict[];
  onClose: () => void;
}) {
  const mine = conflicts.filter((c) => c.sourceIds.includes(source.id));
  return (
    <aside className="panel">
      <button className="panel-close" onClick={onClose} type="button">
        Close
      </button>
      <h2>{source.title}</h2>
      <p className="muted">
        {source.type} · {source.date} · {source.country} · owner{" "}
        {source.owner ?? "none"}
      </p>
      {source.body ? <p>{source.body}</p> : null}
      <h3>Claims</h3>
      <ul>
        {source.claims.map((c) => (
          <li key={c.topic}>
            <code>{c.topic}</code> = <strong>{c.value}</strong>
          </li>
        ))}
      </ul>
      <h3>Trust {trust?.score ?? "—"}</h3>
      <ul className="factors">
        {(trust?.factors ?? []).map((f) => (
          <li key={f.id}>
            <span>
              {f.label} ({f.delta >= 0 ? "+" : ""}
              {f.delta})
            </span>
            <small>{f.detail}</small>
          </li>
        ))}
      </ul>
      {mine.length > 0 ? (
        <>
          <h3>Conflicts</h3>
          <ul>
            {mine.map((c) => (
              <li key={c.id}>
                <strong>{c.severity}</strong> — {REASON[c.reason] ?? c.reason}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">No open conflicts for this source in this view.</p>
      )}
    </aside>
  );
}
