import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { catchupDraftPrompt } from "@/prompts/catchupDraft";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const contacts = await prisma.contact.findMany({
    where: {
      userId: session.user.id,
      isWorthwhile: true,
      excludedFromCatchup: false,
      lastContactDate: { not: null },
    },
    include: {
      threads: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        select: { snippet: true },
      },
    },
    orderBy: { lastContactDate: "asc" },
  });

  // Filter to contacts who are overdue for catch-up
  const overdue = contacts.filter((c) => {
    if (!c.lastContactDate) return false;
    const freqDays = c.catchUpFrequencyDays || 30;
    const daysSince = Math.floor(
      (now.getTime() - c.lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince >= freqDays;
  });

  // Generate drafts in parallel (limit to top 20)
  const top20 = overdue.slice(0, 20);

  const results = await Promise.all(
    top20.map(async (contact) => {
      const daysSince = Math.floor(
        (now.getTime() - contact.lastContactDate!.getTime()) / (1000 * 60 * 60 * 24)
      );

      let draftOpening = "";
      try {
        const res = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: catchupDraftPrompt({
              name: contact.name || contact.email,
              relationshipSummary: contact.relationshipSummary || "",
              daysSinceContact: daysSince,
              lastSnippet: contact.threads[0]?.snippet || undefined,
            }),
          }],
          max_tokens: 150,
        });
        draftOpening = res.choices[0].message.content?.trim() || "";
      } catch {
        draftOpening = "";
      }

      return {
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          relationshipSummary: contact.relationshipSummary,
          catchUpFrequencyDays: contact.catchUpFrequencyDays,
          lastContactDate: contact.lastContactDate,
        },
        daysSinceContact: daysSince,
        draftOpening,
      };
    })
  );

  return NextResponse.json(results);
}
