const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

const CLIENT_ID = () => process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = () => process.env.GOOGLE_CLIENT_SECRET ?? "";
const REDIRECT_URI = () =>
  `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/integrations/gmail/callback`;

export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix ms
}

export interface ParsedEmail {
  messageId: string;
  threadId: string;
  from: string;
  subject: string;
  text: string;
  inReplyTo?: string;
  attachments: Array<{ name: string; content: string; mimeType: string }>;
  date: string;
}

export function getGmailAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID(),
    redirect_uri: REDIRECT_URI(),
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "email",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeGmailCode(code: string): Promise<GmailTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      redirect_uri: REDIRECT_URI(),
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    error?: string;
  };
  if (data.error) throw new Error(`Gmail OAuth error: ${data.error}`);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshGmailToken(refreshToken: string): Promise<GmailTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json() as {
    access_token: string;
    expires_in: number;
    error?: string;
  };
  if (data.error) throw new Error(`Gmail token refresh error: ${data.error}`);
  return {
    accessToken: data.access_token,
    refreshToken, // refresh token doesn't rotate
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function getGmailAccountEmail(accessToken: string): Promise<string> {
  const res = await fetch(`${GMAIL_API}/users/me/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json() as { emailAddress: string };
  return data.emailAddress;
}

export async function setupGmailWatch(
  accessToken: string,
  topic: string
): Promise<{ historyId: string; expiration: string }> {
  const res = await fetch(`${GMAIL_API}/users/me/watch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topicName: topic,
      labelIds: ["INBOX"],
    }),
  });
  const data = await res.json() as {
    historyId: string;
    expiration: string;
    error?: { message: string };
  };
  if (data.error) throw new Error(`Gmail watch error: ${data.error.message}`);
  return { historyId: data.historyId, expiration: data.expiration };
}

export async function listGmailHistory(
  accessToken: string,
  startHistoryId: string
): Promise<string[]> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: "messageAdded",
    labelId: "INBOX",
  });
  const res = await fetch(`${GMAIL_API}/users/me/history?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json() as {
    history?: Array<{ messagesAdded?: Array<{ message: { id: string } }> }>;
    historyId?: string;
    error?: { message: string };
  };
  if (data.error) throw new Error(`Gmail history error: ${data.error.message}`);

  const messageIds = new Set<string>();
  for (const h of data.history ?? []) {
    for (const m of h.messagesAdded ?? []) {
      messageIds.add(m.message.id);
    }
  }
  return [...messageIds];
}

function decodeBase64Url(str: string): string {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function findHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<ParsedEmail> {
  const res = await fetch(`${GMAIL_API}/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const msg = await res.json() as {
    id: string;
    threadId: string;
    payload: {
      headers: Array<{ name: string; value: string }>;
      body?: { data?: string };
      parts?: Array<{
        mimeType: string;
        filename?: string;
        body?: { data?: string; attachmentId?: string; size?: number };
        parts?: Array<{
          mimeType: string;
          filename?: string;
          body?: { data?: string; attachmentId?: string };
        }>;
      }>;
    };
    error?: { message: string };
  };
  if (msg.error) throw new Error(`Gmail message error: ${msg.error.message}`);

  const headers = msg.payload.headers;
  const from = findHeader(headers, "From");
  const subject = findHeader(headers, "Subject");
  const date = findHeader(headers, "Date");
  const inReplyTo = findHeader(headers, "In-Reply-To") || undefined;
  const gmailMsgId = findHeader(headers, "Message-Id");

  // Extract body text and attachments from parts
  let text = "";
  const attachments: ParsedEmail["attachments"] = [];

  function processParts(
    parts: typeof msg.payload.parts
  ) {
    if (!parts) return;
    for (const part of parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        text += decodeBase64Url(part.body.data);
      } else if (part.mimeType === "text/html" && !text && part.body?.data) {
        // fallback: strip HTML tags
        text += decodeBase64Url(part.body.data).replace(/<[^>]+>/g, " ");
      } else if (
        part.filename &&
        part.body?.data &&
        !part.body.attachmentId
      ) {
        attachments.push({
          name: part.filename,
          content: part.body.data,
          mimeType: part.mimeType,
        });
      }
      if (part.parts) processParts(part.parts);
    }
  }

  if (msg.payload.body?.data) {
    text = decodeBase64Url(msg.payload.body.data);
  }
  processParts(msg.payload.parts);

  return {
    messageId: gmailMsgId || msg.id,
    threadId: msg.threadId,
    from,
    subject,
    text: text.trim(),
    inReplyTo,
    attachments,
    date,
  };
}
