import { Job } from "bullmq";
import { getGmailClient } from "../../lib/gmail";
import { prisma } from "../../lib/prisma";
import { openai } from "../../lib/openai";
import { worthwhilePrompt } from "../../prompts/worthwhile";
import { summarizeThreadPrompt } from "../../prompts/summarizeThread";
import { summarizeRelationshipPrompt } from "../../prompts/summarizeRelationship";
import pLimit from "p-limit";

interface SyncJobData {
  userId: string;
}

function extractPlainText(payload: any): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8").slice(0, 2000);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
  }

  return "";
}

function extractHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

export async function syncGmail(job: Job<SyncJobData>) {
  const { userId } = job.data;

  await prisma.user.update({
    where: { id: userId },
    data: { syncStatus: "syncing", syncProgress: 0 },
  });

  const syncLog = await prisma.syncLog.create({
    data: { userId },
  });

  try {
    const gmail = await getGmailClient(userId);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // ── Phase 1: Enumerate all thread IDs ──────────────────────────────────
    const threadIds: string[] = [];
    let pageToken: string | undefined;

    const query = user.lastSyncedAt
      ? `after:${Math.floor(user.lastSyncedAt.getTime() / 1000)}`
      : undefined;

    do {
      const res = await gmail.users.threads.list({
        userId: "me",
        maxResults: 500,
        pageToken,
        q: query,
      });
      const threads = res.data.threads || [];
      threadIds.push(...threads.map((t) => t.id!));
      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);

    await job.updateProgress(5);

    // ── Phase 2: Fetch thread details ──────────────────────────────────────
    const limit = pLimit(10);
    const userEmail = user.email;

    type ThreadData = {
      gmailThreadId: string;
      subject: string;
      snippet: string;
      lastMessageAt: Date | null;
      messageCount: number;
      needsReply: boolean;
      messages: Array<{
        gmailMsgId: string;
        fromEmail: string;
        toEmails: string[];
        subject: string;
        bodyText: string;
        sentAt: Date | null;
        isFromUser: boolean;
      }>;
      participants: Set<string>;
      participantNames: Map<string, string>;
    };

    const threadDataMap = new Map<string, ThreadData>();

    const fetchBatch = async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          limit(async () => {
            try {
              const res = await gmail.users.threads.get({
                userId: "me",
                id,
                format: "full",
              });

              const thread = res.data;
              const messages = thread.messages || [];
              if (messages.length === 0) return;

              const lastMsg = messages[messages.length - 1];
              const lastHeaders = lastMsg.payload?.headers || [];
              const subject = extractHeader(lastHeaders, "subject") || "(no subject)";
              const snippet = thread.snippet || "";

              const lastMsgDate = lastMsg.internalDate
                ? new Date(parseInt(lastMsg.internalDate))
                : null;

              const lastMsgFrom = extractHeader(lastHeaders, "from");
              const lastMsgIsFromUser = lastMsgFrom.includes(userEmail);

              const participants = new Set<string>();
              const participantNames = new Map<string, string>();

              const parsedMessages = messages.map((msg) => {
                const headers = msg.payload?.headers || [];
                const from = extractHeader(headers, "from");
                const to = extractHeader(headers, "to");
                const msgSubject = extractHeader(headers, "subject");
                const bodyText = extractPlainText(msg.payload);
                const sentAt = msg.internalDate
                  ? new Date(parseInt(msg.internalDate))
                  : null;
                const isFromUser = from.includes(userEmail);

                // Extract email + name from "Name <email>" format
                const fromMatch = from.match(/^(.*?)\s*<(.+?)>$/);
                const fromEmail = fromMatch ? fromMatch[2].toLowerCase() : from.toLowerCase().trim();
                const fromName = fromMatch ? fromMatch[1].trim().replace(/"/g, "") : "";

                if (fromEmail && !fromEmail.includes(userEmail)) {
                  participants.add(fromEmail);
                  if (fromName) participantNames.set(fromEmail, fromName);
                }

                const toEmails = to
                  .split(",")
                  .map((t: string) => {
                    const m = t.trim().match(/^.*?<(.+?)>$/);
                    return m ? m[1].toLowerCase() : t.trim().toLowerCase();
                  })
                  .filter((e: string) => e && !e.includes(userEmail));

                return {
                  gmailMsgId: msg.id!,
                  fromEmail,
                  toEmails,
                  subject: msgSubject,
                  bodyText,
                  sentAt,
                  isFromUser,
                };
              });

              threadDataMap.set(id, {
                gmailThreadId: id,
                subject,
                snippet,
                lastMessageAt: lastMsgDate,
                messageCount: messages.length,
                needsReply: !lastMsgIsFromUser,
                messages: parsedMessages,
                participants,
                participantNames,
              });
            } catch {
              // Skip threads that fail to fetch
            }
          })
        )
      );
    };

    const batchSize = 50;
    for (let i = 0; i < threadIds.length; i += batchSize) {
      await fetchBatch(threadIds.slice(i, i + batchSize));
      const progress = 5 + Math.floor(((i + batchSize) / threadIds.length) * 65);
      await job.updateProgress(Math.min(progress, 70));
    }

    // ── Phase 3: Upsert threads + messages, extract contacts ──────────────
    const contactThreadMap = new Map<string, string[]>(); // email -> threadIds
    const contactNameMap = new Map<string, string>();

    for (const [, td] of threadDataMap) {
      // Upsert thread
      const thread = await prisma.thread.upsert({
        where: { userId_gmailThreadId: { userId, gmailThreadId: td.gmailThreadId } },
        create: {
          userId,
          gmailThreadId: td.gmailThreadId,
          subject: td.subject,
          snippet: td.snippet,
          lastMessageAt: td.lastMessageAt,
          messageCount: td.messageCount,
          needsReply: td.needsReply,
        },
        update: {
          subject: td.subject,
          snippet: td.snippet,
          lastMessageAt: td.lastMessageAt,
          messageCount: td.messageCount,
          needsReply: td.needsReply,
        },
      });

      // Upsert messages
      for (const msg of td.messages) {
        await prisma.message.upsert({
          where: { gmailMsgId: msg.gmailMsgId },
          create: { threadId: thread.id, ...msg },
          update: { bodyText: msg.bodyText },
        });
      }

      // Track contacts
      for (const email of td.participants) {
        if (!contactThreadMap.has(email)) contactThreadMap.set(email, []);
        contactThreadMap.get(email)!.push(td.gmailThreadId);
        if (td.participantNames.has(email)) {
          contactNameMap.set(email, td.participantNames.get(email)!);
        }
      }
    }

    // Upsert contacts
    for (const [email, threadIdsForContact] of contactThreadMap) {
      const relatedThreads = threadIdsForContact
        .map((tid) => threadDataMap.get(tid))
        .filter(Boolean) as ThreadData[];

      const dates = relatedThreads
        .map((t) => t.lastMessageAt)
        .filter(Boolean)
        .sort() as Date[];

      await prisma.contact.upsert({
        where: { userId_email: { userId, email } },
        create: {
          userId,
          email,
          name: contactNameMap.get(email) || null,
          threadCount: threadIdsForContact.length,
          firstContactDate: dates[0] || null,
          lastContactDate: dates[dates.length - 1] || null,
        },
        update: {
          name: contactNameMap.get(email) || undefined,
          threadCount: { increment: threadIdsForContact.length },
          lastContactDate: dates[dates.length - 1] || undefined,
        },
      });
    }

    await job.updateProgress(80);

    // ── Phase 4: GPT worthwhile filtering ─────────────────────────────────
    const contactsToFilter = await prisma.contact.findMany({
      where: { userId, threadCount: { gte: 2 }, isWorthwhile: false },
    });

    const filterLimit = pLimit(10);

    await Promise.all(
      contactsToFilter.map((contact) =>
        filterLimit(async () => {
          const relatedThreadIds = contactThreadMap.get(contact.email) || [];
          const relatedThreads = relatedThreadIds
            .map((tid) => threadDataMap.get(tid))
            .filter(Boolean) as ThreadData[];

          const subjects = relatedThreads.map((t) => t.subject);
          const snippets = relatedThreads.map((t) => t.snippet).filter(Boolean);

          try {
            const res = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: worthwhilePrompt({ name: contact.name || "", email: contact.email, threadCount: contact.threadCount, subjects, snippets }) }],
              response_format: { type: "json_object" },
              max_tokens: 100,
            });

            const parsed = JSON.parse(res.choices[0].message.content || "{}");
            await prisma.contact.update({
              where: { id: contact.id },
              data: {
                isWorthwhile: parsed.isWorthwhile || false,
                worthwhileReason: parsed.reason || null,
              },
            });
          } catch {
            // Keep default isWorthwhile=false on error
          }
        })
      )
    );

    await job.updateProgress(90);

    // ── Phase 5: Summarize threads + relationships ─────────────────────────
    const worthwhileContacts = await prisma.contact.findMany({
      where: { userId, isWorthwhile: true },
      include: {
        threads: {
          orderBy: { lastMessageAt: "desc" },
          take: 10,
          include: { messages: { take: 5, orderBy: { sentAt: "asc" } } },
        },
      },
    });

    const summaryLimit = pLimit(5);

    await Promise.all(
      worthwhileContacts.map((contact) =>
        summaryLimit(async () => {
          const threadSummaries: string[] = [];

          // Summarize each thread
          for (const thread of contact.threads) {
            if (thread.summary) {
              threadSummaries.push(thread.summary);
              continue;
            }

            try {
              const messages = thread.messages.map((m) => ({
                from: m.fromEmail || "unknown",
                body: m.bodyText || "",
                date: m.sentAt?.toISOString().split("T")[0] || "",
              }));

              const res = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: summarizeThreadPrompt({ subject: thread.subject || "", messages }) }],
                max_tokens: 150,
              });

              const summary = res.choices[0].message.content?.trim() || "";
              await prisma.thread.update({ where: { id: thread.id }, data: { summary } });
              threadSummaries.push(summary);
            } catch {
              // Skip failed summaries
            }
          }

          // Compute needs_reply: check if last thread's last message is from contact
          const latestThread = contact.threads[0];
          if (latestThread) {
            const lastMsg = latestThread.messages[latestThread.messages.length - 1];
            const needsReply = lastMsg ? !lastMsg.isFromUser : false;
            await prisma.thread.update({
              where: { id: latestThread.id },
              data: { needsReply },
            });
          }

          // Relationship summary
          if (threadSummaries.length > 0 && !contact.relationshipSummary) {
            try {
              const res = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{
                  role: "user",
                  content: summarizeRelationshipPrompt({
                    name: contact.name || "",
                    email: contact.email,
                    threadSummaries,
                    firstContact: contact.firstContactDate?.toISOString().split("T")[0] || "unknown",
                    lastContact: contact.lastContactDate?.toISOString().split("T")[0] || "unknown",
                  }),
                }],
                max_tokens: 300,
              });

              const summary = res.choices[0].message.content?.trim() || "";
              await prisma.contact.update({
                where: { id: contact.id },
                data: { relationshipSummary: summary },
              });
            } catch {
              // Skip failed relationship summaries
            }
          }
        })
      )
    );

    // ── Phase 6: Link threads to contacts, finalize ────────────────────────
    const allContacts = await prisma.contact.findMany({ where: { userId } });
    const contactByEmail = new Map(allContacts.map((c) => [c.email, c.id]));

    for (const [, td] of threadDataMap) {
      const primaryEmail = [...td.participants][0];
      if (primaryEmail) {
        const contactId = contactByEmail.get(primaryEmail);
        if (contactId) {
          await prisma.thread.updateMany({
            where: { userId, gmailThreadId: td.gmailThreadId },
            data: { contactId },
          });
        }
      }
    }

    const worthwhileCount = await prisma.contact.count({ where: { userId, isWorthwhile: true } });

    await prisma.user.update({
      where: { id: userId },
      data: { syncStatus: "complete", syncProgress: 100, lastSyncedAt: new Date() },
    });

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        finishedAt: new Date(),
        threadsProcessed: threadIds.length,
        contactsFound: worthwhileCount,
      },
    });

    await job.updateProgress(100);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await prisma.user.update({
      where: { id: userId },
      data: { syncStatus: "error" },
    });
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: { finishedAt: new Date(), errorMessage: msg },
    });
    throw error;
  }
}
