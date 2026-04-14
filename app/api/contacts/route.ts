import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const worthwhileOnly = searchParams.get("worthwhile") === "true";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  const where = {
    userId: session.user.id,
    ...(worthwhileOnly ? { isWorthwhile: true } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { lastContactDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({ contacts, total, page, pages: Math.ceil(total / limit) });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contactId, excludedFromCatchup, catchUpFrequencyDays } = await req.json();

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId: session.user.id },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.contact.update({
    where: { id: contactId },
    data: {
      ...(excludedFromCatchup !== undefined ? { excludedFromCatchup } : {}),
      ...(catchUpFrequencyDays !== undefined ? { catchUpFrequencyDays } : {}),
    },
  });

  return NextResponse.json(updated);
}
