export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--color-paper)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span
            className="text-2xl font-bold"
            style={{ fontFamily: "Fraunces, Georgia, serif", color: "var(--color-ink)" }}
          >
            Agent Hub
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
