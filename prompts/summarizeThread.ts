export function summarizeThreadPrompt(thread: {
  subject: string;
  messages: Array<{ from: string; body: string; date: string }>;
}): string {
  const msgText = thread.messages
    .map((m) => `[${m.date}] ${m.from}: ${m.body.slice(0, 500)}`)
    .join("\n---\n");

  return `Summarize this email thread in 2 clear sentences. Focus on what was discussed, decided, or asked. Be specific — no vague filler.

Subject: ${thread.subject}

Messages:
${msgText}

Respond with just the 2-sentence summary, nothing else.`;
}
