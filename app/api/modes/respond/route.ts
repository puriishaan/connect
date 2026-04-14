import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const threads = await prisma.thread.findMany({
    where: {
      userId: session.user.id,
      needsReply: true,
      contact: { isWorthwhile: true },
    },
    include: {
      contact: {
        select: { id: true, name: true, email: true, relationshipSummary: true },
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  return NextResponse.json(threads);
}
