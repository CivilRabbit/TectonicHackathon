import { FileText, Mail, MessagesSquare, type LucideIcon } from 'lucide-react';
import type { SourceKind } from '../types';

export const ORIGIN_LABELS: Record<SourceKind, string> = {
  email: 'Email',
  chat: 'Company chat',
  document: 'Document',
};

export const ORIGIN_ICONS: Record<SourceKind, LucideIcon> = {
  email: Mail,
  chat: MessagesSquare,
  document: FileText,
};

export const ORIGIN_BLURB: Record<SourceKind, string> = {
  email: 'The message this timeline point was ingested from.',
  chat: 'The company chat this timeline point was ingested from.',
  document: 'The company text document this timeline point was ingested from.',
};
