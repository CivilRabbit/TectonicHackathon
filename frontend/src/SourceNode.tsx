import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Source } from "./types";

type Data = {
  source: Source;
  trust: number;
  inConflict: boolean;
  pulse: boolean;
};

export function SourceNode({ data, selected }: NodeProps) {
  const { source, trust, inConflict } = data as Data;
  return (
    <div
      className={[
        "src-node",
        `src-${source.type}`,
        inConflict ? "src-conflict" : "",
        selected ? "src-selected" : "",
      ].join(" ")}
    >
      <Handle type="target" position={Position.Left} />
      <div className="src-meta">
        <span className="src-type">{source.type}</span>
        <span className="src-date">{source.date}</span>
        <span className="src-country">{source.country}</span>
      </div>
      <div className="src-title">{source.title}</div>
      <div className="src-trust">
        Trust {trust}
        <span className="src-bar">
          <span style={{ width: `${trust}%` }} />
        </span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
