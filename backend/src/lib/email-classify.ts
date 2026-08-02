import OpenAI from "openai";

export type EmailClass =
  | "new_order"
  | "quote_request"
  | "invoice"
  | "shipping_update"
  | "cancellation"
  | "spam"
  | "unknown";

function getClient() {
  return new OpenAI();
}

export async function classifyEmail(
  subject: string,
  text: string
): Promise<EmailClass> {
  if (!process.env.OPENAI_API_KEY) return "new_order"; // default in dev

  const completion = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 20,
    messages: [
      {
        role: "system",
        content: `Classify this email into exactly one category and respond with ONLY the category name, nothing else.

Categories:
- new_order: Customer placing a new purchase order or requesting to buy something
- quote_request: Customer asking for pricing, a quote, or availability
- invoice: A bill, invoice, or payment confirmation
- shipping_update: Tracking info, delivery update, or shipping confirmation
- cancellation: Request to cancel an existing order
- spam: Unsolicited commercial email, auto-reply, or irrelevant content
- unknown: None of the above`,
      },
      {
        role: "user",
        content: `Subject: ${subject}\n\n${text.slice(0, 2000)}`,
      },
    ],
  });

  const raw = completion.choices[0].message.content?.trim().toLowerCase() ?? "";
  const valid: EmailClass[] = [
    "new_order", "quote_request", "invoice",
    "shipping_update", "cancellation", "spam", "unknown",
  ];
  return valid.find((c) => raw.includes(c)) ?? "unknown";
}
