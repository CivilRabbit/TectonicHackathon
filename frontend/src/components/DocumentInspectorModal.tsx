import { X } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';
import { ORIGIN_ICONS, ORIGIN_LABELS } from '../config/origins';
import { SOURCE_LABELS } from '../config/sources';
import { SEVERITY_STYLES } from '../config/ui';
import { cn } from '../lib/cn';
import type { ClientDocument, DocumentInspectionState, FieldConflict, IngestedSource, SourceClaim } from '../types';
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

        <dt className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Record</dt>
        <dd className="flex items-center gap-1.5 text-zinc-200">
          {document ? <RecordKind kind={document.origin.kind} /> : <span className="text-zinc-500">Unknown</span>}
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

      <div className="scroll-thin min-h-0 flex-1 overflow-auto bg-zinc-950">
        {document ? (
          <>
            <SourceOriginBody origin={document.origin} />
            <PayloadPreview document={document} highlightKey={claim.sourceField} />
          </>
        ) : null}
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

function RecordKind({ kind }: { kind: IngestedSource['kind'] }) {
  const Icon = ORIGIN_ICONS[kind];
  return (
    <>
      <Icon className="h-3.5 w-3.5 text-zinc-400" />
      <span>{ORIGIN_LABELS[kind]}</span>
    </>
  );
}

function SourceOriginBody({ origin }: { origin: IngestedSource }) {
  if (origin.kind === 'email') {
    return (
      <div className="border-b border-zinc-800 px-4 py-3">
        <Meta label="From">
          {origin.fromName} <span className="text-zinc-500">&lt;{origin.fromAddress}&gt;</span>
        </Meta>
        <Meta label="To">
          {origin.toName} <span className="text-zinc-500">&lt;{origin.toAddress}&gt;</span>
        </Meta>
        <Meta label="Subject">
          <span className="font-medium text-zinc-100">{origin.subject}</span>
        </Meta>
        <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-300">{origin.body}</p>
      </div>
    );
  }

  if (origin.kind === 'chat') {
    const people = [...new Set(origin.messages.map((message) => message.author))];
    return (
      <div className="border-b border-zinc-800 px-4 py-3">
        <Meta label="Channel">
          <span className="font-medium text-zinc-100">{origin.channel}</span>
        </Meta>
        <Meta label="Thread">{origin.thread}</Meta>
        <Meta label="People">{people.join(', ')}</Meta>
        <div className="mt-3 space-y-2">
          {origin.messages.map((message, index) => (
            <article key={`${message.author}-${message.at}-${index}`} className="rounded-sm bg-zinc-900 px-3 py-2 ring-1 ring-zinc-800">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] font-semibold text-zinc-100">{message.author}</span>
                <time className="font-mono text-[10px] text-zinc-500">{message.at}</time>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-300">{message.body}</p>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-zinc-800 px-4 py-3">
      <Meta label="Type">{origin.documentType}</Meta>
      <Meta label="Reference">
        <span className="font-mono text-[11px] text-zinc-200">{origin.reference}</span>
      </Meta>
      <Meta label="Title">
        <span className="font-medium text-zinc-100">{origin.title}</span>
      </Meta>
      <article className="mt-3 rounded-sm border border-zinc-800 bg-zinc-900/60 px-3 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-500">
          {origin.documentType} · {origin.reference}
        </p>
        <h3 className="mt-1 text-[13px] font-medium text-zinc-100">{origin.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-300">{origin.body}</p>
      </article>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 py-0.5 text-[12px]">
      <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">{label}</div>
      <div className="min-w-0 break-words text-zinc-300">{children}</div>
    </div>
  );
}

function PayloadPreview({ document, highlightKey }: { document: ClientDocument; highlightKey: string }) {
  const lines = JSON.stringify(document.payload, null, 2).split('\n');
  const marker = `  ${JSON.stringify(highlightKey)}:`;

  return (
    <div>
      <p className="px-4 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-500">Fields read from this source</p>
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
    </div>
  );
}
