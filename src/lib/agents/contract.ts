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
}

export interface ExtractedData {
  fields: Record<string, ExtractedField>;
  orderConfidence: number;
}

export type ValidationOutcome = "auto" | "review";

export interface ValidationResult {
  outcome: ValidationOutcome;
  reasons: string[];
  resolvedCustomerId?: string;
  resolvedProductId?: string;
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
