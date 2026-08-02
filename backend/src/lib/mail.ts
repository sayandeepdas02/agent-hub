import { Resend } from "resend";

const FROM = process.env.RESEND_FROM ?? "Agent Hub <noreply@agenthub.app>";
const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Agent Hub password",
    html: `
      <p>Click the link below to reset your password. It expires in 1 hour.</p>
      <p><a href="${url}">${url}</a></p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
}

export async function sendWorkspaceInvite(
  email: string,
  inviterName: string,
  workspaceName: string,
  token: string
) {
  const url = `${APP_URL}/invite/${token}`;
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `${inviterName} invited you to ${workspaceName} on Agent Hub`,
    html: `
      <p><strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on Agent Hub.</p>
      <p><a href="${url}">Accept invitation</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });
}
