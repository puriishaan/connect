import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { updateRankPrompt } from "@/prompts/updateRank";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { updateText } = await req.json();
  if (!updateText?.trim()) return NextResponse.json({ error: "updateText required" }, { status: 400 });

  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id, isWorthwhile: true, relationshipSummary: { not: null } },
    select: { email: true, name: true, relationshipSummary: true },
  });

  if (contacts.length === 0) return NextResponse.json([]);

  // Batch into groups of 20
  const BATCH = 20;
  const allScores: Array<{ email: string; score: number; reason: string }> = [];

  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH);
    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: updateRankPrompt(
            updateText,
            batch.map((c) => ({
              email: c.email,
              name: c.name || c.email,
              relationshipSummary: c.relationshipSummary || "",
            }))
          ),
        }],
        response_format: { type: "json_object" },
        max_tokens: 600,
      });

      const parsed = JSON.parse(res.choices[0].message.content || "[]");
      const arr = Array.isArray(parsed) ? parsed : parsed.contacts || [];
      allScores.push(...arr);
    } catch {
      // Skip failed batches
    }
  }

  // Join with contact data and filter + sort
  const contactMap = new Map(contacts.map((c) => [c.email, c]));
  const ranked = allScores
    .filter((s) => s.score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((s) => ({
      contact: contactMap.get(s.email),
      score: s.score,
      reason: s.reason,
    }))
    .filter((r) => r.contact);

  return NextResponse.json(ranked);
}
