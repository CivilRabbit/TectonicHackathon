import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ORIGIN_BLURB, ORIGIN_ICONS, ORIGIN_LABELS } from '../config/origins';
import { cn } from '../lib/cn';
import type { ChatSource, ClientDocument, EmailSource, TextDocumentSource } from '../types';
import { canonicalFieldKey, getFieldDefinition } from '../utils/engine';
import { formatDateTime, formatValue } from '../utils/format';
import { SourceBadge } from './ui/SourceBadge';

interface SourceViewerDialogProps {
  documents: ClientDocument[];
  documentId: string;
  onSelectDocument: (documentId: string) => void;
  onClose: () => void;
}

export function SourceViewerDialog({ documents, documentId, onSelectDocument, onClose }: SourceViewerDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const active = documents.find((item) => item.id === documentId) ?? documents[0];

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = window.document.body.style.overflow;
    window.document.body.style.overflow = 'hidden';
    return () => {
      window.document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!active) return null;
  const { origin } = active;
  const Icon = ORIGIN_ICONS[origin.kind];
  const fields = Object.entries(active.payload).map(([rawKey, value]) => {
    const key = canonicalFieldKey(rawKey);
    const definition = getFieldDefinition(key);
    return { rawKey, key, label: definition.label, format: definition.format, value };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Close source" className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-indigo-600" />
              <h2 id={titleId} className="text-sm font-semibold text-slate-900">
                {ORIGIN_LABELS[origin.kind]}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{ORIGIN_BLURB[origin.kind]}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {documents.length > 1 && (
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50 px-3 py-2">
            {documents.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectDocument(item.id)}
                className={cn(
                  'shrink-0 rounded-md px-2 py-1 text-xs font-medium transition',
                  item.id === active.id ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white',
                )}
              >
                {ORIGIN_LABELS[item.origin.kind]} · {item.title}
              </button>
            ))}
          </div>
        )}

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          {origin.kind === 'email' && <EmailView email={origin} createdAt={active.createdAt} />}
          {origin.kind === 'chat' && <ChatView chat={origin} createdAt={active.createdAt} />}
          {origin.kind === 'document' && <DocumentView document={origin} author={active.author} createdAt={active.createdAt} />}

          <section className="border-t border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fields read from this source</h3>
              <SourceBadge source={active.source} />
              <span className="font-mono text-[10px] text-slate-400">
                {active.id} · v{active.version}
              </span>
            </div>
            <dl className="divide-y divide-slate-200/80 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {fields.map((field) => (
                <div key={field.rawKey} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 px-3 py-2 text-xs">
                  <dt className="text-slate-500">{field.label}</dt>
                  <dd className={cn('text-right font-medium', field.value === null ? 'text-amber-700' : 'text-slate-900')}>
                    {field.value === null ? 'Withdrawn' : formatValue(field.value, field.format)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function EmailView({ email, createdAt }: { email: EmailSource; createdAt: string }) {
  return (
    <>
      <div className="space-y-1 border-b border-slate-100 px-4 py-3 text-sm">
        <MetaRow label="From">
          {email.fromName} <span className="text-slate-500">&lt;{email.fromAddress}&gt;</span>
        </MetaRow>
        <MetaRow label="To">
          {email.toName} <span className="text-slate-500">&lt;{email.toAddress}&gt;</span>
        </MetaRow>
        <MetaRow label="Date">{formatDateTime(createdAt)}</MetaRow>
        <MetaRow label="Subject">
          <span className="font-semibold text-slate-900">{email.subject}</span>
        </MetaRow>
      </div>
      <div className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed text-slate-800">{email.body}</div>
    </>
  );
}

function ChatView({ chat, createdAt }: { chat: ChatSource; createdAt: string }) {
  const participants = [...new Set(chat.messages.map((message) => message.author))];
  return (
    <>
      <div className="space-y-1 border-b border-slate-100 px-4 py-3 text-sm">
        <MetaRow label="Channel">
          <span className="font-semibold text-slate-900">{chat.channel}</span>
        </MetaRow>
        <MetaRow label="Thread">{chat.thread}</MetaRow>
        <MetaRow label="Date">{formatDateTime(createdAt)}</MetaRow>
        <MetaRow label="People">{participants.join(', ')}</MetaRow>
      </div>
      <div className="space-y-2 px-4 py-4">
        {chat.messages.map((message, index) => (
          <article key={`${message.author}-${message.at}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-semibold text-slate-900">{message.author}</span>
              <time className="shrink-0 text-[11px] text-slate-400">{message.at}</time>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{message.body}</p>
          </article>
        ))}
      </div>
    </>
  );
}

function DocumentView({
  document,
  author,
  createdAt,
}: {
  document: TextDocumentSource;
  author: string;
  createdAt: string;
}) {
  return (
    <>
      <div className="space-y-1 border-b border-slate-100 px-4 py-3 text-sm">
        <MetaRow label="Type">{document.documentType}</MetaRow>
        <MetaRow label="Reference">
          <span className="font-mono text-[13px] text-slate-800">{document.reference}</span>
        </MetaRow>
        <MetaRow label="Author">{author}</MetaRow>
        <MetaRow label="Date">{formatDateTime(createdAt)}</MetaRow>
        <MetaRow label="Title">
          <span className="font-semibold text-slate-900">{document.title}</span>
        </MetaRow>
      </div>
      <article className="mx-4 my-4 rounded-lg border border-slate-200 bg-amber-50/40 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {document.documentType} · {document.reference}
        </p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">{document.title}</h3>
        <div className="mt-3 whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-800">{document.body}</div>
      </article>
    </>
  );
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="min-w-0 break-words text-slate-700">{children}</div>
    </div>
  );
}
