import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { addSource, fetchGraph, resetGraph } from "./api";
import { AddSourceForm } from "./AddSourceForm";
import { layoutGraph } from "./layout";
import { SourceNode } from "./SourceNode";
import { SourcePanel } from "./SourcePanel";
import type { GraphDiff, GraphResponse, SourceCreate, ViewerCountry } from "./types";

const nodeTypes = { sourceNode: SourceNode };

function AppInner() {
  const [country, setCountry] = useState<ViewerCountry>("BE");
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [diff, setDiff] = useState<GraphDiff | null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  const load = useCallback(async (c: ViewerCountry) => {
    setError(null);
    try {
      const next = await fetchGraph(c);
      setGraph(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load graph");
    }
  }, []);

  useEffect(() => {
    void load(country);
  }, [country, load]);

  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    return layoutGraph(graph, highlighted);
  }, [graph, highlighted]);

  const selected = graph?.nodes.find((n) => n.id === selectedId);

  async function onAdd(body: SourceCreate) {
    setBusy(true);
    setError(null);
    try {
      const res = await addSource(country, body);
      setGraph(res.graph);
      setDiff(res.diff);
      const ids = new Set([
        ...res.diff.addedNodes.map((n) => n.id),
        ...res.diff.addedEdges.map((e) => e.id),
        ...res.diff.newConflicts.flatMap((c) => c.sourceIds),
      ]);
      setHighlighted(ids);
      setSelectedId(res.source.id);
      window.setTimeout(() => setHighlighted(new Set()), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="top">
        <div>
          <h1>Northwind Knowledge Graph</h1>
          <p className="muted">
            Invented hybrid-work rules. Two sources disagree — which can you trust,
            and does it apply to you?
          </p>
        </div>
        <label className="country">
          Work location
          <select
            value={country}
            onChange={(e) => {
              setDiff(null);
              setCountry(e.target.value as ViewerCountry);
            }}
          >
            <option value="BE">Belgium (BE)</option>
            <option value="NL">Netherlands (NL)</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setDiff(null);
            void resetGraph(country).then(setGraph);
          }}
        >
          Reset seed
        </button>
      </header>

      {error ? <div className="banner error">{error}</div> : null}
      {diff ? (
        <div className="banner diff">
          +{diff.addedNodes.length} sources, +{diff.addedEdges.length} edges, +
          {diff.newConflicts.length} conflicts
          {diff.resolvedConflicts.length
            ? `, resolved ${diff.resolvedConflicts.length}`
            : ""}
        </div>
      ) : null}

      <div className="stage">
        <div className="canvas">
          <div className="axis">Older → newer (by date)</div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            fitView
            minZoom={0.35}
            maxZoom={1.4}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
        {selected && graph ? (
          <SourcePanel
            source={selected}
            trust={graph.trust[selected.id]}
            conflicts={graph.conflicts}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <aside className="panel muted">
            <p>Click a node for claims and the trust breakdown.</p>
            <p>
              Red outline = open conflict. Green edge = supersedes. Red edge =
              contradicts.
            </p>
          </aside>
        )}
      </div>

      <AddSourceForm onSubmit={onAdd} busy={busy} />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
