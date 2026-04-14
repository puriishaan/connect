export function summarizeRelationshipPrompt(contact: {
  name: string;
  email: string;
  threadSummaries: string[];
  firstContact: string;
  lastContact: string;
}): string {
  return `Write a relationship summary paragraph for this contact. Describe who they are, what topics you've discussed, the nature of the relationship (professional/personal/academic), and any notable interactions. Be specific and concrete.

Contact: ${contact.name || contact.email} (${contact.email})
First contact: ${contact.firstContact}
Last contact: ${contact.lastContact}

Thread summaries:
${contact.threadSummaries.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Write 3-5 sentences. Speak in second person ("You met X through...", "You've discussed...").`;
}
