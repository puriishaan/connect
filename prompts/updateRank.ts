export function updateRankPrompt(
  updateText: string,
  contacts: Array<{ email: string; name: string; relationshipSummary: string }>
): string {
  const contactList = contacts
    .map((c) => `- [${c.email}] ${c.name || c.email}: ${c.relationshipSummary}`)
    .join("\n");

  return `The user wants to share this life update with relevant contacts:

UPDATE: "${updateText}"

For each contact below, score from 0-10 how much they would genuinely care about this update. Consider professional relevance, personal closeness, and shared history.

Contacts:
${contactList}

Return a JSON array only, no explanation:
[{"email": "...", "score": 0-10, "reason": "one sentence why they'd care or not"}]`;
}
