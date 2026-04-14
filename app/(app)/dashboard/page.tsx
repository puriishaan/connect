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

      {/* Sync section */}
      <Card className="p-6 space-y-4">
        {user.syncStatus === "idle" || user.syncStatus === "error" ? (
          <>
            <p className="text-sm text-gray-600">
              {user.syncStatus === "error"
                ? "The last sync failed."
                : user.lastSyncedAt
                ? `Last synced ${new Date(user.lastSyncedAt).toLocaleDateString()}`
                : "Your Gmail hasn't been synced yet."}
            </p>
            <form action={startSync}>
              <Button type="submit">
                {user.syncStatus === "error" ? "Retry Sync" : "Sync Gmail"}
              </Button>
            </form>
          </>
        ) : (
          <SyncProgress />
        )}
      </Card>

      {/* Modes */}
      {user.syncStatus === "complete" && (
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
      )}

      {user.syncStatus === "complete" && (
        <div className="flex gap-3">
          <Link href="/contacts">
            <Button variant="outline">All Contacts</Button>
          </Link>
          <Link href="/check">
            <Button variant="outline">Check Contacts</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
