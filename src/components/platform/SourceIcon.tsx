import { MessageSquare, Mail, FileText, Webhook, FileSpreadsheet } from "lucide-react";

type Source = "SLACK" | "EMAIL" | "FORM" | "API" | "CSV";

const icons: Record<Source, React.ElementType> = {
  SLACK: MessageSquare,
  EMAIL: Mail,
  FORM: FileText,
  API: Webhook,
  CSV: FileSpreadsheet,
};

const labels: Record<Source, string> = {
  SLACK: "Slack",
  EMAIL: "Email",
  FORM: "Form",
  API: "API",
  CSV: "CSV",
};

export function SourceIcon({ source }: { source: Source }) {
  const Icon = icons[source];
  return (
    <span
      title={labels[source]}
      className="inline-flex items-center text-[var(--color-text-tertiary)]"
    >
      <Icon size={14} />
    </span>
  );
}
