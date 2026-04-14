"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CatchupItem {
  contact: {
    id: string;
    name: string | null;
    email: string;
    relationshipSummary: string | null;
    catchUpFrequencyDays: number | null;
    lastContactDate: string | null;
  };
  daysSinceContact: number;
  draftOpening: string;
}

export default function CatchupPage() {
  const [items, setItems] = useState<CatchupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/modes/catchup")
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false); });
  }, []);

  const exclude = async (contactId: string) => {
    await fetch("/api/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, excludedFromCatchup: true }),
    });
    setItems((prev) => prev.filter((i) => i.contact.id !== contactId));
  };

  const setFrequency = async (contactId: string, weeks: number) => {
    await fetch("/api/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, catchUpFrequencyDays: weeks * 7 }),
    });
  };

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Catch Up</h1>
        <p className="text-sm text-gray-500 mt-1">People you should reconnect with</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading your catch-up list...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-400 text-sm">You&apos;re all caught up!</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.contact.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{item.contact.name || item.contact.email}</p>
                  <p className="text-xs text-gray-400">{item.contact.email}</p>
                </div>
                <Badge variant="outline">{item.daysSinceContact}d ago</Badge>
              </div>

              {item.contact.relationshipSummary && (
                <p className="text-sm text-gray-500 line-clamp-2">{item.contact.relationshipSummary}</p>
              )}

              {item.draftOpening && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 italic border">
                  &ldquo;{item.draftOpening}&rdquo;
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {item.draftOpening && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copy(item.contact.id, item.draftOpening)}
                  >
                    {copied === item.contact.id ? "Copied!" : "Copy Draft"}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => exclude(item.contact.id)}>
                  Skip
                </Button>
                <select
                  className="text-xs border rounded px-2 py-1 bg-white"
                  defaultValue=""
                  onChange={(e) => e.target.value && setFrequency(item.contact.id, parseInt(e.target.value))}
                >
                  <option value="" disabled>Set frequency</option>
                  <option value="2">Every 2 weeks</option>
                  <option value="4">Every month</option>
                  <option value="6">Every 6 weeks</option>
                  <option value="12">Every 3 months</option>
                  <option value="26">Every 6 months</option>
                </select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
