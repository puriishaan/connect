"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CheckData {
  done: boolean;
  total: number;
  index?: number;
  contact?: {
    id: string;
    name: string | null;
    email: string;
    relationshipSummary: string | null;
    lastContactDate: string | null;
    threadCount: number;
    enrichedData: { currentRole?: string; company?: string; linkedinUrl?: string; summary?: string } | null;
    enrichedAt: string | null;
  };
}

export default function CheckPage() {
  const [data, setData] = useState<CheckData | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enriched, setEnriched] = useState(false);

  const load = async () => {
    const res = await fetch("/api/check");
    setData(await res.json());
    setEnriched(false);
  };

  useEffect(() => { load(); }, []);

  const act = async (action: "confirm" | "skip") => {
    if (action === "confirm" && data?.contact && !data.contact.enrichedAt) {
      setEnriching(true);
      await fetch("/api/check/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: data.contact.id }),
      });
      setEnriching(false);
      setEnriched(true);
    }

    await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
  };

  if (!data) return <div className="max-w-lg mx-auto px-4 py-10 text-gray-400">Loading...</div>;

  if (data.done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-center space-y-3">
        <p className="text-xl font-bold">All done!</p>
        <p className="text-gray-500 text-sm">You&apos;ve reviewed all {data.total} connections.</p>
        <Button variant="outline" onClick={load}>Start Over</Button>
      </div>
    );
  }

  const { contact, index, total } = data;
  if (!contact) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Check Contacts</h1>
        <span className="text-sm text-gray-400">{(index ?? 0) + 1} / {total}</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-black h-1.5 rounded-full"
          style={{ width: `${(((index ?? 0) + 1) / (total || 1)) * 100}%` }}
        />
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-1">
          <p className="text-lg font-semibold">{contact.name || contact.email}</p>
          <p className="text-sm text-gray-400">{contact.email}</p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{contact.threadCount} threads</Badge>
            {contact.lastContactDate && (
              <Badge variant="outline">
                Last: {new Date(contact.lastContactDate).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>

        {contact.relationshipSummary && (
          <p className="text-sm text-gray-600">{contact.relationshipSummary}</p>
        )}

        {contact.enrichedData && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            {contact.enrichedData.currentRole && <p><span className="text-gray-400">Role: </span>{contact.enrichedData.currentRole}</p>}
            {contact.enrichedData.company && <p><span className="text-gray-400">Company: </span>{contact.enrichedData.company}</p>}
            {contact.enrichedData.summary && <p className="text-gray-600 italic">{contact.enrichedData.summary}</p>}
            {contact.enrichedData.linkedinUrl && (
              <a href={contact.enrichedData.linkedinUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">
                LinkedIn
              </a>
            )}
          </div>
        )}

        {enriched && <p className="text-xs text-green-600">Enrichment triggered — data will appear after a moment.</p>}
        {enriching && <p className="text-xs text-gray-400">Searching the web for more info...</p>}

        <p className="text-sm font-medium text-gray-700">Is this a real connection you want to maintain?</p>

        <div className="flex gap-3">
          <Button onClick={() => act("confirm")} disabled={enriching}>
            Yes, confirm
          </Button>
          <Button variant="outline" onClick={() => act("skip")} disabled={enriching}>
            Skip
          </Button>
        </div>
      </Card>
    </div>
  );
}
