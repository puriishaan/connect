export function worthwhilePrompt(contact: {
  name: string;
  email: string;
  threadCount: number;
  subjects: string[];
  snippets: string[];
}): string {
  return `You are analyzing whether an email contact is a genuine, worthwhile human connection worth maintaining.

Contact:
- Name: ${contact.name || "Unknown"}
- Email: ${contact.email}
- Number of email threads: ${contact.threadCount}
- Thread subjects: ${contact.subjects.slice(0, 10).join(", ")}
- Message snippets: ${contact.snippets.slice(0, 5).join(" | ")}

A "worthwhile connection" is a real person the user has had meaningful back-and-forth conversations with — colleagues, friends, mentors, family, professional contacts.

NOT worthwhile: newsletters, mailing lists, automated receipts, order confirmations, one-sided marketing emails, bots, no-reply addresses, bank notifications, app notifications.

Respond with JSON only:
{"isWorthwhile": boolean, "reason": "one sentence explanation"}`;
}
