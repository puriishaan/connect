import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncQueue } from "@/lib/queue";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { syncStatus: true, syncProgress: true, syncJobId: true, lastSyncedAt: true },
  });

  let jobProgress = user.syncProgress;

  if (user.syncJobId && user.syncStatus === "syncing") {
    try {
      const job = await syncQueue.getJob(user.syncJobId);
      if (job) {
        const prog = await job.progress;
        jobProgress = typeof prog === "number" ? prog : user.syncProgress;
      }
    } catch {
      // Fall back to DB progress
    }
  }

  const contactsFound = await prisma.contact.count({
    where: { userId: session.user.id, isWorthwhile: true },
  });

  return NextResponse.json({
    status: user.syncStatus,
    progress: jobProgress,
    lastSyncedAt: user.lastSyncedAt,
    contactsFound,
  });
}
