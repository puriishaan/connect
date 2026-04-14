import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { reachoutMatchPrompt } from "@/prompts/reachoutMatch";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { need } = await req.json();
  if (!need?.trim()) return NextResponse.json({ error: "need required" }, { status: 400 });

  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id, isWorthwhile: true, relationshipSummary: { not: null } },
    select: { email: true, name: true, relationshipSummary: true, enrichedData: true },
  });

  if (contacts.length === 0) return NextResponse.json([]);

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: reachoutMatchPrompt(
        need,
        contacts.map((c) => ({
          email: c.email,
          name: c.name || c.email,
          relationshipSummary:
            c.relationshipSummary +
            (c.enrichedData
              ? ` [Role: ${(c.enrichedData as any).currentRole || "unknown"}, Company: ${(c.enrichedData as any).company || "unknown"}]`
              : ""),
        }))
      ),
    }],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });

  const parsed = JSON.parse(res.choices[0].message.content || "[]");
  const arr = Array.isArray(parsed) ? parsed : parsed.contacts || [];

  const contactMap = new Map(contacts.map((c) => [c.email, c]));
  const results = arr
    .map((r: { email: string; reasoning: string; confidence: string }) => ({
      contact: contactMap.get(r.email),
      reasoning: r.reasoning,
      confidence: r.confidence,
    }))
    .filter((r: { contact: unknown }) => r.contact);

  return NextResponse.json(results);
}
