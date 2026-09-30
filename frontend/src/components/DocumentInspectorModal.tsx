import { X } from 'lucide-react';
import { useEffect, useId } from 'react';
import { SOURCE_LABELS } from '../config/sources';
import { SEVERITY_STYLES } from '../config/ui';
import { cn } from '../lib/cn';
import type { ClientDocument, DocumentInspectionState, FieldConflict, SourceClaim } from '../types';
import { getDocumentById } from '../utils/engine';
import { formatDateTime, formatValue } from '../utils/format';
import { OverrideBadge } from './ui/OverrideBadge';
import { SourceTag } from './ui/SourceTag';

type Side = 'left' | 'right';

interface DocumentInspectorModalProps {
  inspection: DocumentInspectionState;
  conflict: FieldConflict;
  onChangeDocument: (side: Side, documentId: string) => void;
  onAdopt: (claim: SourceClaim) => void;
  onClose: () => void;
}

export function DocumentInspectorModal({ inspection, conflict, onChangeDocument, onAdopt, onClose }: DocumentInspectorModalProps) {
  const titleId = useId();
  const claimsByDocument = new Map(conflict.conflictingValues.map((c) => [c.documentId, c]));
  const left = claimsByDocument.get(inspection.leftDocumentId);
  const right = claimsByDocument.get(inspection.rightDocumentId);
  const severity = SEVERITY_STYLES[conflict.severity];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-full w-full max-w-6xl flex-col rounded-md border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black"
      >
        <header className="flex h-11 shrink-0 items-center gap-3 border-b border-zinc-800 px-4">
          <h2 id={titleId} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-200">
            Conflict Document Inspector
          </h2>
          <span className="text-zinc-700">/</span>
          <span className={cn('font-mono text-[10px] font-semibold', severity.text)}>{severity.tag}</span>
          <span className="text-[13px] text-zinc-100">{conflict.label}</span>
          <span className="font-mono text-[10px] text-zinc-500">{conflict.code}</span>
          <button
            type="button"
            autoFocus
            aria-label="Close inspector"
            onClick={onClose}
            className="ml-auto grid h-7 w-7 place-items-center rounded-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-zinc-800">
          {([
            ['left', left, inspection.rightDocumentId],
            ['right', right, inspection.leftDocumentId],
          ] as const).map(([side, claim, otherId]) =>
            claim ? (
              <DocumentPane
                key={side}
                claim={claim}
                conflict={conflict}
                alternatives={conflict.conflictingValues.filter((c) => c.documentId !== otherId)}
                onChangeDocument={(id) => onChangeDocument(side, id)}
                onAdopt={() => onAdopt(claim)}
              />
            ) : (
              <div key={side} className="p-6 font-mono text-xs text-zinc-500">
                Document is not part of this conflict at the selected point in time.
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

interface DocumentPaneProps {
  claim: SourceClaim;
  conflict: FieldConflict;
  alternatives: SourceClaim[];
  onChangeDocument: (documentId: string) => void;
  onAdopt: () => void;
}

function DocumentPane({ claim, conflict, alternatives, onChangeDocument, onAdopt }: DocumentPaneProps) {
  const document = getDocumentById(claim.documentId);
  const isWinner = conflict.resolvedSource === claim.source;
  const isPinned = isWinner && conflict.resolution === 'override';

  return (
    <div className="flex min-h-0 flex-col">
      <dl className="grid shrink-0 grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-zinc-800 px-4 py-3 text-xs">
        <dt className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Source System</dt>
        <dd className="flex items-center gap-2">
          <SourceTag source={claim.source} rank={claim.rank} />
          <span className="text-zinc-500">{SOURCE_LABELS[claim.source]}</span>
          {isPinned && <OverrideBadge />}
        </dd>

        <dt className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Document</dt>
        <dd className="min-w-0">
          {alternatives.length > 1 ? (
            <select
              value={claim.documentId}
              onChange={(event) => onChangeDocument(event.target.value)}
              className="w-full rounded-sm border border-zinc-700 bg-zinc-950 px-1 py-0.5 font-mono text-[11px] text-zinc-200 focus:outline-none"
            >
              {alternatives.map((alt) => (
                <option key={alt.documentId} value={alt.documentId}>
                  {alt.source} · {getDocumentById(alt.documentId)?.title ?? alt.documentId}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-zinc-200">{document?.title ?? claim.documentId}</span>
          )}
          <span className="ml-2 font-mono text-[10px] text-zinc-500">
            {claim.documentId} · v{claim.version}
          </span>
        </dd>

        <dt className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Ingested</dt>
        <dd className="font-mono text-[11px] text-zinc-200">{formatDateTime(claim.timestamp)}</dd>

        <dt className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Author</dt>
        <dd className="text-zinc-200">{claim.author}</dd>

        <dt className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Value</dt>
        <dd className={cn('text-zinc-50', (conflict.format === 'number' || conflict.format === 'currency') && 'font-mono')}>
          {formatValue(claim.value, conflict.format)}
        </dd>
      </dl>

      <div className="scroll-thin min-h-0 flex-1 overflow-auto bg-zinc-950 py-2">
        {document ? <PayloadPreview document={document} highlightKey={claim.sourceField} /> : null}
      </div>

      <footer className="flex h-11 shrink-0 items-center justify-between border-t border-zinc-800 px-4">
        <span className="font-mono text-[10px] text-zinc-500">
          field <span className="text-zinc-300">{claim.sourceField}</span>
          {claim.sourceField !== conflict.fieldKey && <> → {conflict.fieldKey}</>}
        </span>
        <button
          type="button"
          onClick={onAdopt}
          disabled={isPinned}
          className="rounded-sm border border-zinc-600 bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-900 transition hover:bg-white disabled:cursor-default disabled:border-zinc-800 disabled:bg-transparent disabled:text-zinc-500"
        >
          {isPinned ? 'Adopted' : "Adopt this document's value"}
        </button>
      </footer>
    </div>
  );
}

function PayloadPreview({ document, highlightKey }: { document: ClientDocument; highlightKey: string }) {
  const lines = JSON.stringify(document.payload, null, 2).split('\n');
  const marker = `  ${JSON.stringify(highlightKey)}:`;

  return (
    <pre className="font-mono text-[11px] leading-5">
      {lines.map((line, index) => {
        const highlighted = line.startsWith(marker);
        return (
          <div
            key={index}
            className={cn(
              'grid grid-cols-[2.5rem_minmax(0,1fr)] border-l-2 border-transparent pr-4',
              highlighted && 'border-amber-400 bg-amber-400/10',
            )}
          >
            <span className="select-none pr-3 text-right text-zinc-700">{index + 1}</span>
            <span className={cn('whitespace-pre-wrap break-all', highlighted ? 'text-amber-100' : 'text-zinc-400')}>{line}</span>
          </div>
        );
      })}
    </pre>
  );
}
