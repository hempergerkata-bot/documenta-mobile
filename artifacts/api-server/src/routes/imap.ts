import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { ImapFlow, type MessageStructureObject } from "imapflow";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();
const MAX_PAGE_SIZE = 50;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const APPROVED_HOSTS = new Set(["imap.gmx.com", "imap.web.de", "imap.mail.yahoo.com", "secureimap.t-online.de"]);
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 12;
const rateLimits = new Map<string, number[]>();

type Credentials = { host: string; port: 993; email: string; password: string };
type ListRequest = Credentials & { mailbox: string; from: string; to: string; pageSize?: number; cursor?: string };
type AttachmentRequest = Credentials & { mailbox: string; uid: number; part: string };

function badRequest(response: Response, message: string) {
  response.status(400).json({ error: "invalid_request", message });
}

function readCredentials(body: unknown): Credentials | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = body as Record<string, unknown>;
  const host = typeof value.host === "string" ? value.host.trim().toLowerCase() : "";
  const email = typeof value.email === "string" ? value.email.trim() : "";
  const password = typeof value.password === "string" ? value.password : "";
  // The credentials may only ever be sent to audited provider hosts.
  if (!APPROVED_HOSTS.has(host) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 1 || password.length > 1024) return undefined;
  if (value.port !== 993) return undefined;
  return { host, port: 993, email, password };
}

function readMailbox(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const mailbox = value.trim();
  return mailbox.length > 0 && mailbox.length <= 255 && !/[\u0000-\u001f\u007f]/.test(mailbox) ? mailbox : undefined;
}

function readListRequest(request: Request): ListRequest | undefined {
  const credentials = readCredentials(request.body);
  const body = request.body as Record<string, unknown>;
  const mailbox = readMailbox(body?.mailbox);
  const from = typeof body?.from === "string" ? new Date(body.from) : undefined;
  const to = typeof body?.to === "string" ? new Date(body.to) : undefined;
  const pageSize = body?.pageSize === undefined ? 25 : body.pageSize;
  const cursor = body?.cursor;
  if (!credentials || !mailbox || !from || !to || !Number.isFinite(from.valueOf()) || !Number.isFinite(to.valueOf()) || from > to ||
    typeof pageSize !== "number" || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE ||
    (cursor !== undefined && (typeof cursor !== "string" || !/^[1-9]\d{0,9}$/.test(cursor)))) return undefined;
  return { ...credentials, mailbox, from: from.toISOString(), to: to.toISOString(), pageSize, cursor: cursor as string | undefined };
}

function readAttachmentRequest(request: Request): AttachmentRequest | undefined {
  const credentials = readCredentials(request.body);
  const body = request.body as Record<string, unknown>;
  const mailbox = readMailbox(body?.mailbox);
  const uid = body?.uid;
  const part = body?.part;
  if (!credentials || !mailbox || typeof uid !== "number" || !Number.isSafeInteger(uid) || uid < 1 ||
    typeof part !== "string" || !/^\d+(?:\.\d+)*$/.test(part)) return undefined;
  return { ...credentials, mailbox, uid, part };
}

function allowedMime(value: string | undefined): value is string {
  const mime = value?.split(";", 1)[0].trim().toLowerCase();
  return mime === "application/pdf" || Boolean(mime?.startsWith("image/"));
}

function attachments(structure: MessageStructureObject | undefined): Array<{ part: string; filename: string; mimeType: string; size: number }> {
  if (!structure) return [];
  const children = structure.childNodes?.flatMap(attachments) ?? [];
  const mimeType = structure.type.toLowerCase();
  const filename = structure.dispositionParameters?.filename ?? structure.parameters?.name;
  if (!structure.part || !filename || !allowedMime(mimeType) || !Number.isFinite(structure.size) || !structure.size || structure.size > MAX_ATTACHMENT_BYTES) return children;
  return [...children, { part: structure.part, filename: filename.slice(0, 255), mimeType, size: structure.size }];
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 240);
  }
  if (family === 6) {
    const value = address.toLowerCase();
    return value !== "::" && value !== "::1" && !value.startsWith("fe") && !value.startsWith("ff") &&
      !value.startsWith("fc") && !value.startsWith("fd") && !value.startsWith("::ffff:127.") &&
      !value.startsWith("::ffff:10.") && !value.startsWith("::ffff:192.168.") && !value.startsWith("::ffff:169.254.");
  }
  return false;
}

export async function resolveApprovedHost(host: string): Promise<string> {
  if (!APPROVED_HOSTS.has(host)) throw new Error("imap_host_not_allowed");
  const addresses = await lookup(host, { all: true, verbatim: true });
  const publicAddress = addresses.find((entry) => isPublicAddress(entry.address));
  if (!publicAddress) throw new Error("imap_host_not_allowed");
  return publicAddress.address;
}

function allowRequestForIp(key: string): boolean {
  const now = Date.now();
  const recent = (rateLimits.get(key) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) return false;
  recent.push(now); rateLimits.set(key, recent);
  return true;
}

function createClient(credentials: Credentials, address: string) {
  return new ImapFlow({
    // Connect the just-resolved address, but validate TLS against the audited hostname.
    host: address,
    port: 993,
    secure: true,
    tls: { servername: credentials.host },
    auth: { user: credentials.email, pass: credentials.password },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    maxLiteralSize: MAX_ATTACHMENT_BYTES + 1024,
    maxResponseSize: MAX_ATTACHMENT_BYTES + 64 * 1024,
  });
}

function sendImapError(response: any, error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
  const tooLarge = code === "attachment_too_large" || error instanceof Error && error.message === "attachment_too_large";
  const status = tooLarge ? 413 : ["AUTHENTICATIONFAILED", "AUTHENTICATION_FAILURE"].includes(code.toUpperCase()) ? 401 : 502;
  response.status(status).json({
    error: status === 401 ? "imap_authentication_failed" : status === 413 ? "attachment_too_large" : "imap_unavailable",
    message: status === 401 ? "IMAP authentication failed." : status === 413 ? "The attachment exceeds the 25 MB limit." : "The IMAP server could not complete the request.",
  });
}

router.post("/imap/messages", async (request, response) => {
  const input = readListRequest(request);
  if (!input) return badRequest(response, "host, port 993, email, password, mailbox, date range, pageSize, or cursor is invalid.");

  let client: ReturnType<typeof createClient> | undefined;
  let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | undefined;
  try {
    const address = await resolveApprovedHost(input.host);
    const caller = request.ip || request.socket.remoteAddress || "unknown";
    if (!allowRequestForIp(`${caller}:${input.host}`)) return response.status(429).json({ error: "too_many_requests", message: "Please try again later." });
    client = createClient(input, address);
    await client.connect();
    lock = await client.getMailboxLock(input.mailbox, { readOnly: true });
    const uids = await client.search({ since: new Date(input.from), before: new Date(new Date(input.to).getTime() + 86_400_000) }, { uid: true }) || [];
    const cursor = input.cursor ? Number(input.cursor) : Number.POSITIVE_INFINITY;
    const pageUids = uids.filter((uid) => uid < cursor).sort((a, b) => b - a).slice(0, input.pageSize);
    const messages = [];
    for await (const message of client.fetch(pageUids, { envelope: true, bodyStructure: true, internalDate: true, size: true }, { uid: true })) {
      messages.push({
        uid: message.uid,
        subject: message.envelope?.subject ?? "",
        from: message.envelope?.from?.map((address) => address.address).filter(Boolean) ?? [],
        receivedAt: message.internalDate ? new Date(message.internalDate).toISOString() : undefined,
        size: message.size ?? 0,
        attachments: attachments(message.bodyStructure),
      });
    }
    messages.sort((a, b) => b.uid - a.uid);
    const hasMore = pageUids.length === input.pageSize && uids.some((uid) => uid < pageUids[pageUids.length - 1]);
    response.json({ messages, nextCursor: hasMore ? String(pageUids[pageUids.length - 1]) : undefined, hasMore });
  } catch (error) {
    sendImapError(response, error);
  } finally {
    lock?.release();
    const connectedClient = client;
    if (connectedClient) await connectedClient.logout().catch(() => connectedClient.close());
  }
});

router.post("/imap/attachments/download", async (request, response) => {
  const input = readAttachmentRequest(request);
  if (!input) return badRequest(response, "host, port 993, email, password, mailbox, uid, or attachment part is invalid.");

  let client: ReturnType<typeof createClient> | undefined;
  let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | undefined;
  try {
    const address = await resolveApprovedHost(input.host);
    const caller = request.ip || request.socket.remoteAddress || "unknown";
    if (!allowRequestForIp(`${caller}:${input.host}`)) return response.status(429).json({ error: "too_many_requests", message: "Please try again later." });
    client = createClient(input, address);
    await client.connect();
    lock = await client.getMailboxLock(input.mailbox, { readOnly: true });
    const { meta, content } = await client.download(String(input.uid), input.part, { uid: true, maxBytes: MAX_ATTACHMENT_BYTES + 1 });
    if (!allowedMime(meta.contentType) || meta.expectedSize < 1 || meta.expectedSize > MAX_ATTACHMENT_BYTES) {
      content.destroy();
      return response.status(415).json({ error: "attachment_not_allowed", message: "Only PDF and image attachments up to 25 MB are supported." });
    }
    const hash = createHash("sha256");
    let size = 0;
    let remainder = Buffer.alloc(0);
    const encoded: string[] = [];
    for await (const chunk of content) {
      const data = Buffer.concat([remainder, Buffer.from(chunk)]);
      const wholeLength = data.length - (data.length % 3);
      const whole = data.subarray(0, wholeLength);
      remainder = data.subarray(wholeLength);
      size += whole.length;
      if (size + remainder.length > MAX_ATTACHMENT_BYTES) throw new Error("attachment_too_large");
      hash.update(whole);
      encoded.push(whole.toString("base64"));
    }
    if (remainder.length) {
      size += remainder.length;
      hash.update(remainder);
      encoded.push(remainder.toString("base64"));
    }
    response.json({ filename: (meta.filename || "attachment").replace(/[\r\n"]/g, "_").slice(0, 255), mimeType: meta.contentType.split(";", 1)[0].toLowerCase(), size, sha256: hash.digest("hex"), base64: encoded.join("") });
  } catch (error) {
    sendImapError(response, error);
  } finally {
    lock?.release();
    const connectedClient = client;
    if (connectedClient) await connectedClient.logout().catch(() => connectedClient.close());
  }
});

export default router;