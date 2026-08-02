import { prisma } from "@/lib/prisma";
import type { ExtractedData, ValidationResult, Issue } from "../contract";

const CONFIDENCE_THRESHOLD = 0.7;
const SIMILARITY_THRESHOLD = 0.3;

interface FuzzyCustomer { id: string; name: string; similarity: number; }
interface FuzzyProduct { id: string; sku: string; name: string; similarity: number; }

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
  query: string
): Promise<{ id: string; sku: string; name: string } | null> {
  const exact = await prisma.product.findFirst({
    where: { workspaceId, sku: { equals: query, mode: "insensitive" } },
  });
  if (exact) return exact;

  const results = await prisma.$queryRaw<FuzzyProduct[]>`
    SELECT id, sku, name,
      GREATEST(
        word_similarity(${query}, sku),
        word_similarity(${query}, name)
      ) AS similarity
    FROM agent_order_intake."Product"
    WHERE "workspaceId" = ${workspaceId}
      AND GREATEST(
        word_similarity(${query}, sku),
        word_similarity(${query}, name)
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
  const issues: Issue[] = [];

  // ── Top-level checks ────────────────────────────────────────────────────────
  const customerName = data.fields["customer_name"]?.value as string | null;
  if (!customerName) {
    issues.push({
      field: "customer_name",
      code: "MISSING",
      severity: "error",
      message: "Customer name is required",
    });
  }

  if (data.lineItems.length === 0) {
    issues.push({
      field: "line_items",
      code: "NO_LINE_ITEMS",
      severity: "error",
      message: "No line items could be extracted from the message",
    });
  }

  if (data.orderConfidence < CONFIDENCE_THRESHOLD) {
    issues.push({
      field: "order",
      code: "LOW_CONFIDENCE",
      severity: "warning",
      message: `Overall extraction confidence ${(data.orderConfidence * 100).toFixed(0)}% is below the ${CONFIDENCE_THRESHOLD * 100}% threshold`,
    });
  }

  // ── Per-line-item checks ─────────────────────────────────────────────────────
  for (let i = 0; i < data.lineItems.length; i++) {
    const item = data.lineItems[i];
    const prefix = `line_items[${i}]`;

    if (!item.product_sku.value && !item.product_name.value) {
      issues.push({
        field: `${prefix}.product_sku`,
        code: "MISSING_PRODUCT",
        severity: "error",
        message: `Line item ${i + 1}: product SKU or name is required`,
      });
    }

    if (item.quantity.value === null || item.quantity.value === undefined) {
      issues.push({
        field: `${prefix}.quantity`,
        code: "MISSING_QUANTITY",
        severity: "error",
        message: `Line item ${i + 1}: quantity is required`,
      });
    }

    const skuConf = item.product_sku.confidence;
    if (skuConf > 0 && skuConf < CONFIDENCE_THRESHOLD) {
      issues.push({
        field: `${prefix}.product_sku`,
        code: "LOW_CONFIDENCE",
        severity: "warning",
        message: `Line item ${i + 1}: product SKU confidence is low (${(skuConf * 100).toFixed(0)}%)`,
      });
    }
  }

  // ── Catalog lookups ──────────────────────────────────────────────────────────
  let resolvedCustomerId: string | undefined;
  if (customerName) {
    const customer = await findCustomerFuzzy(workspaceId, customerName);
    if (!customer) {
      issues.push({
        field: "customer_name",
        code: "NOT_FOUND",
        severity: "warning",
        message: `Customer not found: "${customerName}"`,
      });
    } else {
      resolvedCustomerId = customer.id;
    }
  }

  const resolvedProductIds: string[] = [];
  for (let i = 0; i < data.lineItems.length; i++) {
    const item = data.lineItems[i];
    const query = (item.product_sku.value ?? item.product_name.value) as string | null;
    if (query) {
      const product = await findProductFuzzy(workspaceId, query);
      if (!product) {
        issues.push({
          field: `line_items[${i}].product_sku`,
          code: "NOT_FOUND",
          severity: "warning",
          message: `Line item ${i + 1}: product not found for "${query}"`,
        });
      }
      resolvedProductIds.push(product?.id ?? "");
    } else {
      resolvedProductIds.push("");
    }
  }

  const hasErrors = issues.some((iss) => iss.severity === "error");

  return {
    outcome: hasErrors ? "review" : "auto",
    issues,
    resolvedCustomerId,
    resolvedProductIds,
  };
}
