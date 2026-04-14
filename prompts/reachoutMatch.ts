export function reachoutMatchPrompt(
  need: string,
  contacts: Array<{ email: string; name: string; relationshipSummary: string }>
): string {
  const contactList = contacts
    .map((c) => `- [${c.email}] ${c.name || c.email}: ${c.relationshipSummary}`)
    .join("\n");

  return `The user needs help with the following:

NEED: "${need}"

From the contacts below, identify the top 5 who could genuinely help. Consider their professional background, implied expertise, past conversations, and any relevant experience mentioned.

Contacts:
${contactList}

Return a JSON array only (exactly 5 or fewer if fewer are relevant):
[{"email": "...", "reasoning": "specific reason they can help", "confidence": "high"|"medium"|"low"}]`;
}
