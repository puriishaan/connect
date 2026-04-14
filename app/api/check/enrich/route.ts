import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrichQueue } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contactId } = await req.json();

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: session.user.id },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const job = await enrichQueue.add("enrich", { contactId });

  return NextResponse.json({ jobId: job.id });
}
