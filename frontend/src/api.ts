import type { AddSourceResponse, GraphResponse, SourceCreate, ViewerCountry } from "./types";
import startBe from "./mocks/graph.BE.start.json";
import startNl from "./mocks/graph.NL.start.json";
import afterBe from "./mocks/graph.BE.after-email.json";
import diffBe from "./mocks/graph.BE.diff-after-email.json";

const useMock = import.meta.env.VITE_USE_MOCK === "true";
const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function tryFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function fetchGraph(country: ViewerCountry): Promise<GraphResponse> {
  if (useMock) {
    return (country === "NL" ? startNl : startBe) as GraphResponse;
  }
  try {
    return await tryFetch<GraphResponse>(`/graph?country=${country}`);
  } catch {
    return (country === "NL" ? startNl : startBe) as GraphResponse;
  }
}

export async function addSource(
  country: ViewerCountry,
  body: SourceCreate,
): Promise<AddSourceResponse> {
  if (useMock) {
    return {
      source: (diffBe as AddSourceResponse["diff"]).addedNodes[0],
      diff: diffBe as AddSourceResponse["diff"],
      graph: afterBe as GraphResponse,
    };
  }
  return tryFetch<AddSourceResponse>(`/sources?country=${country}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function resetGraph(country: ViewerCountry): Promise<GraphResponse> {
  if (useMock) {
    return (country === "NL" ? startNl : startBe) as GraphResponse;
  }
  return tryFetch<GraphResponse>(`/reset?country=${country}`, { method: "POST" });
}

export { useMock };
