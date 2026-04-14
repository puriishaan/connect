import { Job } from "bullmq";
import { prisma } from "../../lib/prisma";
import { openai } from "../../lib/openai";
import { braveSearch } from "../../lib/brave";

interface EnrichJobData {
  contactId: string;
}

export async function enrichContact(job: Job<EnrichJobData>) {
  const { contactId } = job.data;

  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  const emailDomain = contact.email.split("@")[1] || "";

  const query1 = `${contact.name || contact.email} ${emailDomain} LinkedIn`;
  const query2 = `${contact.name || contact.email} ${emailDomain} professional`;

  const [results1, results2] = await Promise.allSettled([
    braveSearch(query1),
    braveSearch(query2),
  ]);

  const searchText = [
    results1.status === "fulfilled" ? results1.value : "",
    results2.status === "fulfilled" ? results2.value : "",
  ].join("\n\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "user",
      content: `Extract professional information about ${contact.name || contact.email} (${contact.email}) from these search results.

Search results:
${searchText}

Return JSON only:
{
  "currentRole": "job title or null",
  "company": "company name or null",
  "location": "city/country or null",
  "linkedinUrl": "URL or null",
  "summary": "1-2 sentence professional summary or null",
  "confidence": "high|medium|low"
}`,
    }],
    response_format: { type: "json_object" },
    max_tokens: 200,
  });

  const enrichedData = JSON.parse(res.choices[0].message.content || "{}");

  await prisma.contact.update({
    where: { id: contactId },
    data: { enrichedData, enrichedAt: new Date() },
  });
}
