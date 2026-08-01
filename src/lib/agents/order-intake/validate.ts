import { prisma } from "@/lib/prisma";
import type { ExtractedData, ValidationResult } from "../contract";

const CONFIDENCE_THRESHOLD = 0.9;
const REQUIRED_FIELDS = ["customer_name", "product_sku", "quantity"];
const SIMILARITY_THRESHOLD = 0.3;

interface FuzzyCustomer {
  id: string;
  name: string;
  similarity: number;
}

interface FuzzyProduct {
  id: string;
  sku: string;
  name: string;
  similarity: number;
}

export async function findCustomerFuzzy(
  workspaceId: string,
  name: string
): Promise<{ id: string; name: string } | null> {
  const results = await prisma.$queryRaw<FuzzyCustomer[]>`
    SELECT id, name, word_similarity(${name}, name) AS similarity
    FROM agent_order_intake."Customer"
    WHERE "workspaceId" = ${workspaceId}
      AND word_similarity(${name}, name) > ${SIMILARITY_THRESHOLD}
    ORDER BY similarity DESC
    LIMIT 1
  `;
  return results[0] ?? null;
}

export async function findProductFuzzy(
  workspaceId: string,
  sku: string
): Promise<{ id: string; sku: string; name: string } | null> {
  // Exact SKU match first
  const exact = await prisma.product.findFirst({
    where: { workspaceId, sku: { equals: sku, mode: "insensitive" } },
  });
  if (exact) return exact;

  // Trigram fallback on name and SKU
  const results = await prisma.$queryRaw<FuzzyProduct[]>`
    SELECT id, sku, name,
      GREATEST(
        word_similarity(${sku}, sku),
        word_similarity(${sku}, name)
      ) AS similarity
    FROM agent_order_intake."Product"
    WHERE "workspaceId" = ${workspaceId}
      AND GREATEST(
        word_similarity(${sku}, sku),
        word_similarity(${sku}, name)
      ) > ${SIMILARITY_THRESHOLD}
    ORDER BY similarity DESC
    LIMIT 1
  `;
  return results[0] ?? null;
}

export async function validate(
  data: ExtractedData,
  workspaceId: string
): Promise<ValidationResult> {
  const reasons: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const f = data.fields[field];
    if (!f || f.value === null || f.value === undefined) {
      reasons.push(`Missing required field: ${field}`);
    }
  }

  if (data.orderConfidence < CONFIDENCE_THRESHOLD) {
    reasons.push(
      `Order confidence ${(data.orderConfidence * 100).toFixed(0)}% below threshold (90%)`
    );
  }

  // Only do DB lookups when basic validation passes — avoids noisy errors
  // for obviously incomplete extractions
  const customerName = data.fields["customer_name"]?.value as string | null;
  const sku = data.fields["product_sku"]?.value as string | null;

  let resolvedCustomerId: string | undefined;
  let resolvedProductId: string | undefined;

  if (customerName) {
    const customer = await findCustomerFuzzy(workspaceId, customerName);
    if (!customer) {
      reasons.push(`Customer not found: "${customerName}"`);
    } else {
      resolvedCustomerId = customer.id;
    }
  }

  if (sku) {
    const product = await findProductFuzzy(workspaceId, sku);
    if (!product) {
      reasons.push(`Product/SKU not found: "${sku}"`);
    } else {
      resolvedProductId = product.id;
    }
  }

  return {
    outcome: reasons.length === 0 ? "auto" : "review",
    reasons,
    resolvedCustomerId,
    resolvedProductId,
  };
}
