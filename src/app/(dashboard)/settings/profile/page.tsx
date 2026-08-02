import { requireAuth } from "@/lib/auth-utils";
import { TopBar } from "@/components/platform/shell/TopBar";
import { ProfilePanel } from "@/components/platform/ProfilePanel";

export default async function ProfilePage() {
  const ctx = await requireAuth();

  return (
    <>
      <TopBar section="Profile" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg">
          <div className="mb-6">
            <h1 className="text-xl text-[var(--color-ink)]">Profile</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Your account details and password.
            </p>
          </div>
          <ProfilePanel
            name={ctx.userName ?? ""}
            email={ctx.userEmail}
            image={ctx.userImage ?? null}
          />
        </div>
      </main>
    </>
  );
}
