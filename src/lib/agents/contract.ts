export type TriggerSource = "slack" | "email" | "form" | "api" | "csv";

export interface NormalizedRecord {
  id: string;
  workspaceId: string;
  source: TriggerSource;
  text: string;
  attachments: Array<{ name: string; url?: string; content?: string; mimeType: string; s3Key?: string }>;
  metadata: Record<string, unknown>;
}

export interface ExtractedField<T = unknown> {
  value: T;
  confidence: number;
  sourceLocation?: string;
  alternatives?: Array<{ value: T; confidence: number }>;
}

export interface ExtractedLineItem {
  product_sku: ExtractedField<string | null>;
  product_name: ExtractedField<string | null>;
  quantity: ExtractedField<number | null>;
  unit_price: ExtractedField<number | null>;
  color: ExtractedField<string | null>;
  size: ExtractedField<string | null>;
  uom: ExtractedField<string | null>;
}

export interface ExtractedData {
  fields: Record<string, ExtractedField>;
  lineItems: ExtractedLineItem[];
  orderConfidence: number;
}

export type IssueSeverity = "error" | "warning";

export interface Issue {
  field: string;
  code: string;
  severity: IssueSeverity;
  message: string;
}

export type ValidationOutcome = "auto" | "review";

export interface ValidationResult {
  outcome: ValidationOutcome;
  issues: Issue[];
  resolvedCustomerId?: string;
  resolvedProductIds?: string[];
}

export interface ExecutionResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export interface AgentDefinition {
  id: string;
  name: string;
  slug: string;
  triggers: TriggerSource[];
  needsExtraction(record: NormalizedRecord): boolean;
  extract(record: NormalizedRecord): Promise<ExtractedData>;
  validate(data: ExtractedData, workspaceId: string): Promise<ValidationResult>;
  execute(orderId: string, workspaceId: string): Promise<ExecutionResult>;
}
