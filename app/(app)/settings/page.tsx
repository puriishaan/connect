import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function startSync() {
  "use server";
  await fetch(`${process.env.NEXTAUTH_URL}/api/sync/start`, { method: "POST" });
}

async function disconnect() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      syncStatus: true,
      lastSyncedAt: true,
    },
  });

  const isSyncing = user.syncStatus === "syncing";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Connected account */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Connected Account
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Gmail · read-only access
            </p>
          </div>
          <form action={disconnect}>
            <Button
              type="submit"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              Disconnect
            </Button>
          </form>
        </div>
      </Card>

      {/* Gmail sync */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Gmail Sync
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            {user.lastSyncedAt ? (
              <p className="text-sm text-gray-700">
                Last synced{" "}
                <span className="font-medium">
                  {new Date(user.lastSyncedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </p>
            ) : (
              <p className="text-sm text-gray-400">Never synced</p>
            )}

            {user.syncStatus === "error" && (
              <p className="text-xs text-red-500">Last sync failed</p>
            )}
            {isSyncing && (
              <p className="text-xs text-blue-500">Sync in progress…</p>
            )}
            {user.syncStatus === "complete" && (
              <p className="text-xs text-gray-400">
                Re-syncing picks up any new emails since the last sync.
              </p>
            )}
          </div>

          {!isSyncing && (
            <form action={startSync}>
              <Button type="submit" variant="outline" size="sm">
                {user.lastSyncedAt ? "Re-sync" : "Start Sync"}
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
