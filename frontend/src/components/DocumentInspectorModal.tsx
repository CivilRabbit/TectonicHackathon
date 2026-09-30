import { SOURCE_LABELS } from '../config/sources';
import { SEVERITY_STYLES } from '../config/ui';
import { cn } from '../lib/cn';
import type { ClientDocument, DocumentInspectionState, FieldConflict, SourceClaim } from '../types';
import { getDocumentById, valuesEqual } from '../utils/engine';
import { formatDateTime, formatValue } from '../utils/format';
import { Modal } from './ui/Modal';
import { OverrideBadge, ResolvedBadge } from './ui/OverrideBadge';
import { SourceTag } from './ui/SourceTag';

type Side = 'left' | 'right';

interface DocumentInspectorModalProps {
  inspection: DocumentInspectionState;
  conflict: FieldConflict;
  onChangeDocument: (side: Side, documentId: string) => void;
  onAdopt: (claim: SourceClaim) => void;
  onResolve: (claim: SourceClaim) => void;
  onReopen: () => void;
  onClose: () => void;
}

export function DocumentInspectorModal({
  inspection,
  conflict,
  onChangeDocument,
  onAdopt,
  onResolve,
  onReopen,
  onClose,
}: DocumentInspectorModalProps) {
  const claimsByDocument = new Map(conflict.conflictingValues.map((c) => [c.documentId, c]));
  const severity = SEVERITY_STYLES[conflict.severity];
  const isResolved = conflict.status === 'resolved';
  const panes: Array<[Side, SourceClaim | undefined, string]> = [
    ['left', claimsByDocument.get(inspection.leftDocumentId), inspection.rightDocumentId],
    ['right', claimsByDocument.get(inspection.rightDocumentId), inspection.leftDocumentId],
  ];

  return (
    <Modal
      title="Conflict Document Inspector"
      onClose={onClose}
      className="max-w-6xl"
      headerContent={
        <>
          <span className="text-zinc-700">/</span>
          <span className={cn('font-mono text-[10px] font-semibold', severity.text)}>{severity.tag}</span>
          <span className="truncate text-[13px] text-zinc-100">{conflict.label}</span>
          <span className="font-mono text-[10px] text-zinc-500">{conflict.code}</span>
        </>
      }
      headerActions={
        isResolved ? (
          <span className="flex items-center gap-2">
            <ResolvedBadge />
            <button type="button" onClick={onReopen} className="font-mono text-[10px] uppercase text-zinc-400 hover:text-zinc-100">
              Reopen
            </button>
          </span>
        ) : null
      }
    >
      {isResolved && (
        <p className="shrink-0 border-b border-zinc-800 px-4 py-2 text-[11px] text-zinc-500">{conflict.rationale}</p>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-zinc-800">
        {panes.map(([side, claim, otherId]) =>
          claim ? (
            <DocumentPane
              key={side}
              claim={claim}
              conflict={conflict}
              alternatives={conflict.conflictingValues.filter((c) => c.documentId !== otherId)}
              onChangeDocument={(id) => onChangeDocument(side, id)}
              onAdopt={() => onAdopt(claim)}
              onResolve={() => onResolve(claim)}
            />
          ) : (
            <div key={side} className="p-6 font-mono text-xs text-zinc-500">
              Document is not part of this conflict at the selected point in time.
            </div>
          ),
        )}
      </div>
    </Modal>
  );
}

interface DocumentPaneProps {
  claim: SourceClaim;
  conflict: FieldConflict;
  alternatives: SourceClaim[];
  onChangeDocument: (documentId: string) => void;
  onAdopt: () => void;
  onResolve: () => void;
}

function DocumentPane({ claim, conflict, alternatives, onChangeDocument, onAdopt, onResolve }: DocumentPaneProps) {
  const sourceDocument = getDocumentById(claim.documentId);
  const isWinner = conflict.resolvedSource === claim.source && valuesEqual(conflict.resolvedValue, claim.value);
  const isPinned = isWinner && conflict.method === 'override';
  const isResolved = conflict.status === 'resolved';

  return (
    <div className="flex min-h-0 flex-col">
      <dl className="grid shrink-0 grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-zinc-800 px-4 py-3 text-xs">
        <dt className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Source System</dt>
        <dd className="flex items-center gap-2">
          <SourceTag source={claim.source} rank={claim.rank} />
          <span className="text-zinc-500">{SOURCE_LABELS[claim.source]}</span>
          {isPinned && !isResolved && <OverrideBadge />}
          {isWinner && isResolved && <ResolvedBadge />}
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
            <span className="text-zinc-200">{sourceDocument?.title ?? claim.documentId}</span>
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
        {sourceDocument && <PayloadPreview document={sourceDocument} highlightKey={claim.sourceField} />}
      </div>

      <footer className="flex h-11 shrink-0 items-center gap-2 border-t border-zinc-800 px-4">
        <span className="mr-auto truncate font-mono text-[10px] text-zinc-500">
          field <span className="text-zinc-300">{claim.sourceField}</span>
          {claim.sourceField !== conflict.fieldKey && <> → {conflict.fieldKey}</>}
        </span>
        {!isResolved && (
          <>
            <button
              type="button"
              onClick={onAdopt}
              disabled={isPinned}
              className="rounded-sm border border-zinc-700 px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-zinc-400 hover:text-white disabled:cursor-default disabled:border-zinc-800 disabled:text-zinc-600"
            >
              {isPinned ? 'Adopted' : "Adopt this document's value"}
            </button>
            <button
              type="button"
              onClick={onResolve}
              className="rounded-sm border border-zinc-300 bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-900 transition hover:bg-white"
            >
              Resolve from this document
            </button>
          </>
        )}
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
