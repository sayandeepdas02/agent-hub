// pdf-parse v1 exports a single async function: pdfParse(buffer) => { text, ... }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (
  buf: Buffer
) => Promise<{ text: string }>;

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text.trim();
}

export async function extractAttachmentText(
  attachments: Array<{ url?: string; content?: string; contentType?: string }>
): Promise<string> {
  const parts: string[] = [];

  for (const att of attachments) {
    if (!att.contentType?.includes("pdf")) continue;

    try {
      let buf: Buffer | null = null;

      if (att.content) {
        buf = Buffer.from(att.content, "base64");
      } else if (att.url) {
        const res = await fetch(att.url);
        if (!res.ok) continue;
        buf = Buffer.from(await res.arrayBuffer());
      }

      if (buf) {
        const text = await extractPdfText(buf);
        if (text) parts.push(`[Attachment]\n${text}`);
      }
    } catch {
      // Non-fatal: skip attachment if parsing fails
    }
  }

  return parts.join("\n\n");
}
