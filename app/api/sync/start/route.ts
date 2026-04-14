import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncQueue } from "@/lib/queue";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.syncStatus === "syncing") {
    return NextResponse.json({ error: "Sync already in progress" }, { status: 409 });
  }

  const job = await syncQueue.add("sync", { userId }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { syncStatus: "syncing", syncProgress: 0, syncJobId: job.id },
  });

  return NextResponse.json({ jobId: job.id });
}
