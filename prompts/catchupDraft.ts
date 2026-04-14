export function catchupDraftPrompt(contact: {
  name: string;
  relationshipSummary: string;
  daysSinceContact: number;
  lastSnippet?: string;
}): string {
  return `Write a warm, natural 2-3 sentence email opening to re-initiate contact with someone the user hasn't spoken to in ${contact.daysSinceContact} days.

Contact name: ${contact.name}
Relationship: ${contact.relationshipSummary}
${contact.lastSnippet ? `Last exchange snippet: "${contact.lastSnippet}"` : ""}

Rules:
- Do NOT be generic ("Hope you're doing well!")
- Reference something specific from the relationship
- Sound like a real person, not a template
- Do NOT include a subject line or sign-off
- Keep it to 2-3 sentences

Write only the email body opening.`;
}
