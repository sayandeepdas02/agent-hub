import OpenAI from "openai";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

type Attachment = {
  name: string;
  url?: string;
  content?: string;  // base64
  mimeType: string;
  s3Key?: string;
};

async function extractPdfText(buf: Buffer): Promise<string> {
  const result = await pdfParse(buf);
  return result.text.trim();
}

async function extractDocxText(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value.trim();
}

async function extractXlsxText(buf: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "buffer" });
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    return `[Sheet: ${name}]\n${XLSX.utils.sheet_to_csv(ws)}`;
  }).join("\n\n");
}

async function extractImageText(buf: Buffer, mimeType: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return "";
  const client = new OpenAI();
  const b64 = buf.toString("base64");
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Extract all text from this image, preserving structure. Return only the extracted text, no commentary." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}`, detail: "high" } },
        ],
      },
    ],
  });
  return res.choices[0].message.content?.trim() ?? "";
}

async function bufferFromAttachment(att: Attachment): Promise<Buffer | null> {
  if (att.content) return Buffer.from(att.content, "base64");
  if (att.url) {
    const res = await fetch(att.url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

export async function extractAttachmentText(attachments: Attachment[]): Promise<string> {
  const parts: string[] = [];

  for (const att of attachments) {
    const mime = att.mimeType.toLowerCase();
    try {
      const buf = await bufferFromAttachment(att);
      if (!buf) continue;

      let text = "";
      if (mime.includes("pdf")) {
        text = await extractPdfText(buf);
      } else if (
        mime.includes("word") ||
        mime.includes("docx") ||
        mime.includes("openxmlformats-officedocument.wordprocessingml")
      ) {
        text = await extractDocxText(buf);
      } else if (
        mime.includes("excel") ||
        mime.includes("xlsx") ||
        mime.includes("spreadsheet") ||
        mime.includes("openxmlformats-officedocument.spreadsheetml")
      ) {
        text = await extractXlsxText(buf);
      } else if (mime.startsWith("image/")) {
        text = await extractImageText(buf, att.mimeType);
      }

      if (text) parts.push(`[Attachment: ${att.name}]\n${text}`);
    } catch {
      // Non-fatal: skip unreadable attachment
    }
  }

  return parts.join("\n\n");
}
