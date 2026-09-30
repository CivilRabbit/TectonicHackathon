import type { Edge as GraphEdge, GraphResponse, Source } from "./types";
import type { Edge, Node } from "@xyflow/react";

const TYPE_Y: Record<string, number> = { doc: 40, email: 210, teams: 380 };

export function layoutGraph(graph: GraphResponse, highlighted: Set<string>) {
  const times = graph.nodes.map((n) => new Date(n.date).getTime());
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(max - min, 1);

  const conflictIds = new Set(graph.conflicts.flatMap((c) => c.sourceIds));

  const nodes: Node[] = graph.nodes.map((source: Source) => {
    const t = new Date(source.date).getTime();
    const x = 40 + ((t - min) / span) * 920;
    const y = TYPE_Y[source.type] ?? 40;
    const trust = graph.trust[source.id]?.score ?? 0;
    const inConflict = conflictIds.has(source.id);
    const pulse = highlighted.has(source.id);
    return {
      id: source.id,
      position: { x, y },
      data: { source, trust, inConflict, pulse },
      type: "sourceNode",
      className: pulse ? "node-pulse" : undefined,
    };
  });

  const styleFor = (type: GraphEdge["type"]) => {
    if (type === "contradicts") return { stroke: "#e85d4c", strokeWidth: 2 };
    if (type === "supersedes") return { stroke: "#3d9a7a", strokeWidth: 2 };
    return { stroke: "#8a8f98", strokeWidth: 1.5, strokeDasharray: "6 4" };
  };

  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    label: e.type,
    animated: e.type === "contradicts" || highlighted.has(e.id),
    style: styleFor(e.type),
    labelStyle: { fill: "#c8ccd2", fontSize: 11 },
  }));

  return { nodes, edges };
}
