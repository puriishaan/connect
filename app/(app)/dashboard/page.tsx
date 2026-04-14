import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SyncProgress from "@/components/SyncProgress";
import Link from "next/link";

async function startSync() {
  "use server";
  await fetch(`${process.env.NEXTAUTH_URL}/api/sync/start`, { method: "POST" });
}

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { syncStatus: true, lastSyncedAt: true },
  });

  const contactsCount = await prisma.contact.count({
    where: { userId: session.user.id, isWorthwhile: true },
  });

  const isFirstTime = user.syncStatus === "idle" && !user.lastSyncedAt;
  const isResync = user.syncStatus === "idle" && !!user.lastSyncedAt;

  const modes = [
    { href: "/modes/catchup", label: "Catch Up", desc: "People you should reconnect with" },
    { href: "/modes/update", label: "Update", desc: "Share news with the right people" },
    { href: "/modes/respond", label: "Respond", desc: "Emails waiting for your reply" },
    { href: "/modes/reachout", label: "Reach Out", desc: "Find who can help you with anything" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-bold">CONNECT</h1>
        <p className="text-gray-500 text-sm mt-1">
          {session.user.name} &middot; {contactsCount} connections
        </p>
      </div>

      {/* First-time: Gmail just connected, never synced */}
      {isFirstTime && (
        <Card className="p-6 space-y-4 border-green-200 bg-green-50">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-900 text-sm">Gmail connected</p>
              <p className="text-green-700 text-xs mt-0.5">{session.user.email}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            CONNECT will read your Gmail history to find your most important relationships and build summaries for each one. This runs once in the background and takes a few minutes.
          </p>
          <form action={startSync}>
            <Button type="submit">Start Sync</Button>
          </form>
        </Card>
      )}

      {/* Previously synced, ready to re-sync */}
      {isResync && (
        <Card className="p-6 space-y-3">
          <p className="text-sm text-gray-600">
            Last synced {new Date(user.lastSyncedAt!).toLocaleDateString()}
          </p>
          <form action={startSync}>
            <Button type="submit" variant="outline">Sync Gmail</Button>
          </form>
        </Card>
      )}

      {/* Error state */}
      {user.syncStatus === "error" && (
        <Card className="p-6 space-y-3 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">The last sync failed. Please try again.</p>
          <form action={startSync}>
            <Button type="submit" variant="outline">Retry Sync</Button>
          </form>
        </Card>
      )}

      {/* In-progress */}
      {user.syncStatus === "syncing" && (
        <Card className="p-6">
          <SyncProgress />
        </Card>
      )}

      {/* Modes — only shown after first sync completes */}
      {user.syncStatus === "complete" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {modes.map((m) => (
              <Link key={m.href} href={m.href}>
                <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
                  <p className="font-semibold">{m.label}</p>
                  <p className="text-sm text-gray-500 mt-1">{m.desc}</p>
                </Card>
              </Link>
            ))}
          </div>
          <div className="flex gap-3">
            <Link href="/contacts">
              <Button variant="outline">All Contacts</Button>
            </Link>
            <Link href="/check">
              <Button variant="outline">Check Contacts</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
