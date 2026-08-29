/**
 * Typed IMAP API request builders.
 *
 * The checked-in generated API client predates these OpenAPI operations, so this
 * module deliberately does not issue requests itself. Regenerate
 * @workspace/api-client-react from lib/api-spec/openapi.yaml and use the
 * generated listImapMessages/downloadImapAttachment functions at the call site.
 * Passwords remain request-only values and must not be put in app state or logs.
 */
export type ImapCredentials = {
  host: string;
  port: 993;
  email: string;
  password: string;
};

export type ImapListRequest = ImapCredentials & {
  mailbox: string;
  from: string;
  to: string;
  pageSize?: number;
  cursor?: string;
};

export type ImapAttachmentDownloadRequest = ImapCredentials & {
  mailbox: string;
  uid: number;
  part: string;
};

export type ImapAttachment = {
  part: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type ImapMessage = {
  uid: number;
  subject: string;
  from: string[];
  receivedAt?: string;
  size: number;
  attachments: ImapAttachment[];
};

export type ImapMessagePage = {
  messages: ImapMessage[];
  nextCursor?: string;
  hasMore: boolean;
};

export type ImapAttachmentContent = {
  filename: string;
  mimeType: string;
  size: number;
  sha256: string;
  base64: string;
};

export function buildImapListRequest(input: ImapListRequest): ImapListRequest {
  return { ...input, host: input.host.trim(), email: input.email.trim(), mailbox: input.mailbox.trim(), pageSize: input.pageSize ?? 25 };
}

export function buildImapAttachmentDownloadRequest(input: ImapAttachmentDownloadRequest): ImapAttachmentDownloadRequest {
  return { ...input, host: input.host.trim(), email: input.email.trim(), mailbox: input.mailbox.trim(), part: input.part.trim() };
}