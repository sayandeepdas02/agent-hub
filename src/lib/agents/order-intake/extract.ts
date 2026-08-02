import OpenAI from "openai";
import type { NormalizedRecord, ExtractedData, ExtractedField, ExtractedLineItem } from "../contract";

const client = new OpenAI();

const SYSTEM_PROMPT = `You are an order intake extraction assistant. Extract purchase order details from the provided message and any attachment text.

Return ONLY valid JSON with this exact structure:
{
  "customer_name": { "value": string|null, "confidence": number, "source_location": string|null },
  "po_number":     { "value": string|null, "confidence": number, "source_location": string|null },
  "requested_ship_date": { "value": string|null, "confidence": number, "source_location": string|null },
  "special_instructions": { "value": string|null, "confidence": number, "source_location": string|null },
  "line_items": [
    {
      "product_sku":  { "value": string|null, "confidence": number, "source_location": string|null, "alternatives": [{"value": string, "confidence": number}] },
      "product_name": { "value": string|null, "confidence": number, "source_location": string|null },
      "quantity":     { "value": number|null, "confidence": number, "source_location": string|null },
      "unit_price":   { "value": number|null, "confidence": number, "source_location": string|null },
      "color":        { "value": string|null, "confidence": number, "source_location": string|null },
      "size":         { "value": string|null, "confidence": number, "source_location": string|null },
      "uom":          { "value": string|null, "confidence": number, "source_location": string|null }
    }
  ]
}

Rules:
- Extract ALL distinct products/line items — never collapse multiple items into one entry
- confidence: 0.0–1.0; use 1.0 only when stated explicitly and unambiguously; use 0.0 when absent or guessed
- source_location: exact phrase copied from the message that led to this value; null when not present
- alternatives: up to 2 alternative values when a SKU or product name is ambiguous; omit (or use []) when unambiguous
- requested_ship_date: normalize to YYYY-MM-DD when the year is determinable; otherwise use the stated phrase
- uom: unit of measure abbreviation (ea, pcs, dz, box, lbs, kg, sqft, etc.)
- Return "line_items": [] when no products are identifiable`;

interface RawField {
  value: unknown;
  confidence: number;
  source_location?: string | null;
  alternatives?: Array<{ value: unknown; confidence: number }>;
}

interface RawLineItem {
  product_sku?: RawField;
  product_name?: RawField;
  quantity?: RawField;
  unit_price?: RawField;
  color?: RawField;
  size?: RawField;
  uom?: RawField;
}

interface RawExtraction {
  customer_name?: RawField;
  po_number?: RawField;
  requested_ship_date?: RawField;
  special_instructions?: RawField;
  line_items?: RawLineItem[];
}

function toField<T>(raw: RawField | undefined): ExtractedField<T> {
  return {
    value: (raw?.value ?? null) as T,
    confidence: raw?.confidence ?? 0,
    ...(raw?.source_location ? { sourceLocation: raw.source_location } : {}),
    ...(raw?.alternatives?.length
      ? { alternatives: raw.alternatives as Array<{ value: T; confidence: number }> }
      : {}),
  };
}

export async function extract(record: NormalizedRecord): Promise<ExtractedData> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Extract order details:\n\n${record.text}` },
    ],
  });

  const raw = completion.choices[0].message.content;
  if (!raw) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(raw) as RawExtraction;

  const fields: Record<string, ExtractedField> = {
    customer_name: toField(parsed.customer_name),
    po_number: toField(parsed.po_number),
    requested_ship_date: toField(parsed.requested_ship_date),
    special_instructions: toField(parsed.special_instructions),
  };

  const lineItems: ExtractedLineItem[] = (parsed.line_items ?? []).map((item) => ({
    product_sku: toField<string | null>(item.product_sku),
    product_name: toField<string | null>(item.product_name),
    quantity: toField<number | null>(item.quantity),
    unit_price: toField<number | null>(item.unit_price),
    color: toField<string | null>(item.color),
    size: toField<string | null>(item.size),
    uom: toField<string | null>(item.uom),
  }));

  // orderConfidence: min of customer confidence and per-item quantity + product identification
  const keyConfs = [
    fields.customer_name.confidence,
    ...lineItems.map((li) => li.quantity.confidence),
    ...lineItems.map((li) =>
      Math.max(li.product_sku.confidence, li.product_name.confidence)
    ),
  ];
  const orderConfidence = keyConfs.length > 0 ? Math.min(...keyConfs) : 0;

  return { fields, lineItems, orderConfidence };
}
