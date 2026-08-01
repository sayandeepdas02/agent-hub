import OpenAI from "openai";
import type { NormalizedRecord, ExtractedData } from "../contract";

const client = new OpenAI();

const SYSTEM_PROMPT = `You are an order intake extraction assistant. Extract purchase order details from the provided message.

Return ONLY valid JSON matching this exact schema:
{
  "customer_name": { "value": string | null, "confidence": number },
  "product_sku": { "value": string | null, "confidence": number },
  "product_name": { "value": string | null, "confidence": number },
  "quantity": { "value": number | null, "confidence": number },
  "requested_ship_date": { "value": string | null, "confidence": number },
  "special_instructions": { "value": string | null, "confidence": number }
}

Confidence scores are 0.0–1.0. Use 0.0 when a field is absent or you are guessing. Use 1.0 only when the value is stated explicitly and unambiguously.`;

export async function extract(record: NormalizedRecord): Promise<ExtractedData> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract order details from this message:\n\n${record.text}`,
      },
    ],
  });

  const raw = completion.choices[0].message.content;
  if (!raw) throw new Error("Empty response from OpenAI");

  const fields = JSON.parse(raw) as Record<
    string,
    { value: unknown; confidence: number }
  >;

  const requiredFields = ["customer_name", "product_sku", "quantity"];
  const orderConfidence = Math.min(
    ...requiredFields.map((f) => fields[f]?.confidence ?? 0)
  );

  return { fields, orderConfidence };
}
