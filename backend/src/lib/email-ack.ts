import { Resend } from "resend";

function getResend() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}
const FROM = process.env.RESEND_FROM ?? "Agent Hub <noreply@agenthub.app>";

export async function sendOrderAcknowledgement(
  to: string,
  originalSubject: string,
  orderId: string
): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const shortId = orderId.slice(-8);
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Re: ${originalSubject}`,
    html: `
      <p>Thank you — we've received your order request.</p>
      <p>Reference: <strong>${shortId}</strong></p>
      <p>Our team will review and follow up shortly. If you have attachments or additional details to share, please reply to this email.</p>
      <p style="color:#888;font-size:12px;">This is an automated acknowledgement. Please do not reply directly to this message.</p>
    `,
  });
}
