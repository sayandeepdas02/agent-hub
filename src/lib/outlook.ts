const MS_TOKEN_URL = (tenant: string) =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
const MS_AUTH_URL = (tenant: string) =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;
const GRAPH_API = "https://graph.microsoft.com/v1.0";

const CLIENT_ID = () => process.env.MICROSOFT_CLIENT_ID ?? "";
const CLIENT_SECRET = () => process.env.MICROSOFT_CLIENT_SECRET ?? "";
const TENANT = () => process.env.MICROSOFT_TENANT_ID ?? "common";
const REDIRECT_URI = () =>
  `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/integrations/outlook/callback`;

export interface OutlookTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
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

export function getOutlookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID(),
    redirect_uri: REDIRECT_URI(),
    response_type: "code",
    scope: "Mail.Read Mail.Send offline_access User.Read",
    response_mode: "query",
    state,
  });
  return `${MS_AUTH_URL(TENANT())}?${params}`;
}

export async function exchangeOutlookCode(code: string): Promise<OutlookTokens> {
  const res = await fetch(MS_TOKEN_URL(TENANT()), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      redirect_uri: REDIRECT_URI(),
      grant_type: "authorization_code",
      scope: "Mail.Read Mail.Send offline_access User.Read",
    }),
  });
  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    error?: string;
    error_description?: string;
  };
  if (data.error) throw new Error(`Outlook OAuth error: ${data.error_description ?? data.error}`);

  // Fetch the user's email
  const me = await fetch(`${GRAPH_API}/me?$select=mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const meData = await me.json() as { mail?: string; userPrincipalName?: string };
  const email = meData.mail ?? meData.userPrincipalName ?? "";

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    email,
  };
}

export async function refreshOutlookToken(refreshToken: string): Promise<Omit<OutlookTokens, "email">> {
  const res = await fetch(MS_TOKEN_URL(TENANT()), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID(),
      client_secret: CLIENT_SECRET(),
      grant_type: "refresh_token",
      scope: "Mail.Read Mail.Send offline_access User.Read",
    }),
  });
  const data = await res.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    error?: string;
  };
  if (data.error) throw new Error(`Outlook token refresh error: ${data.error}`);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

export async function createOutlookSubscription(
  accessToken: string,
  notificationUrl: string
): Promise<string> {
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days
  const res = await fetch(`${GRAPH_API}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      changeType: "created",
      notificationUrl,
      resource: "me/mailFolders('Inbox')/messages",
      expirationDateTime: expiresAt,
      clientState: "agent-hub",
    }),
  });
  const data = await res.json() as { id?: string; error?: { message: string } };
  if (data.error) throw new Error(`Outlook subscription error: ${data.error.message}`);
  return data.id!;
}

export async function renewOutlookSubscription(
  accessToken: string,
  subscriptionId: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  await fetch(`${GRAPH_API}/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expirationDateTime: expiresAt }),
  });
}

export async function getOutlookMessage(
  accessToken: string,
  messageId: string
): Promise<ParsedEmail> {
  const res = await fetch(
    `${GRAPH_API}/me/messages/${messageId}?$select=id,conversationId,from,subject,body,receivedDateTime,internetMessageId,inReplyTo`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const msg = await res.json() as {
    id: string;
    conversationId: string;
    internetMessageId?: string;
    from: { emailAddress: { address: string; name?: string } };
    subject: string;
    body: { contentType: string; content: string };
    receivedDateTime: string;
    inReplyTo?: string;
    error?: { message: string };
  };
  if (msg.error) throw new Error(`Outlook message error: ${msg.error.message}`);

  // Strip HTML if contentType is html
  let text = msg.body.content;
  if (msg.body.contentType === "html") {
    text = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  // Fetch attachments
  const attRes = await fetch(`${GRAPH_API}/me/messages/${messageId}/attachments`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const attData = await attRes.json() as {
    value?: Array<{
      name: string;
      contentType: string;
      contentBytes?: string;
    }>;
  };

  const attachments: ParsedEmail["attachments"] = (attData.value ?? [])
    .filter((a) => a.contentBytes)
    .map((a) => ({
      name: a.name,
      content: a.contentBytes!,
      mimeType: a.contentType,
    }));

  const fromAddr = msg.from.emailAddress.name
    ? `${msg.from.emailAddress.name} <${msg.from.emailAddress.address}>`
    : msg.from.emailAddress.address;

  return {
    messageId: msg.internetMessageId ?? msg.id,
    threadId: msg.conversationId,
    from: fromAddr,
    subject: msg.subject,
    text,
    inReplyTo: msg.inReplyTo ?? undefined,
    attachments,
    date: msg.receivedDateTime,
  };
}
