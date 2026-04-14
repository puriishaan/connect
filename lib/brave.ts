export async function braveSearch(query: string): Promise<string> {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": process.env.BRAVE_API_KEY || "",
      },
    }
  );

  if (!res.ok) throw new Error(`Brave search failed: ${res.status}`);

  const data = await res.json();
  const results = data.web?.results || [];

  return results
    .map((r: { title: string; url: string; description: string }) =>
      `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}`
    )
    .join("\n\n");
}
