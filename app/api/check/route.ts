import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  let session_ = await prisma.checkSession.findUnique({ where: { userId } });
  if (!session_ || session_.completed) {
    session_ = await prisma.checkSession.upsert({
      where: { userId },
      create: { userId, currentIndex: 0, completed: false },
      update: { currentIndex: 0, completed: false },
    });
  }

  const contacts = await prisma.contact.findMany({
    where: { userId, isWorthwhile: true },
    orderBy: { lastContactDate: "desc" },
  });

  if (session_.currentIndex >= contacts.length) {
    await prisma.checkSession.update({ where: { userId }, data: { completed: true } });
    return NextResponse.json({ done: true, total: contacts.length });
  }

  const current = contacts[session_.currentIndex];
  return NextResponse.json({
    done: false,
    contact: current,
    index: session_.currentIndex,
    total: contacts.length,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { action } = await req.json(); // "confirm" | "skip"

  const session_ = await prisma.checkSession.findUnique({ where: { userId } });
  if (!session_) return NextResponse.json({ error: "No active session" }, { status: 400 });

  await prisma.checkSession.update({
    where: { userId },
    data: { currentIndex: session_.currentIndex + 1 },
  });

  return NextResponse.json({ ok: true, action });
}
