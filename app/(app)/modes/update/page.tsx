"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Result {
  contact: { name: string | null; email: string; relationshipSummary: string | null };
  score: number;
  reason: string;
}

export default function UpdatePage() {
  const [updateText, setUpdateText] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!updateText.trim()) return;
    setLoading(true);
    setSubmitted(false);
    const res = await fetch("/api/modes/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateText }),
    });
    const data = await res.json();
    setResults(data);
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Update</h1>
        <p className="text-sm text-gray-500 mt-1">
          Write about something new in your life — we&apos;ll tell you who should hear about it.
        </p>
      </div>

      <div className="space-y-3">
        <Textarea
          placeholder="e.g. I just started a new job at Google as a software engineer..."
          rows={4}
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
        />
        <Button onClick={submit} disabled={loading || !updateText.trim()}>
          {loading ? "Analyzing..." : "Find who should know"}
        </Button>
      </div>

      {submitted && results.length === 0 && (
        <p className="text-sm text-gray-400">No strong matches found for this update.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-medium">{results.length} contacts should hear this</p>
          {results.map((r) => (
            <Card key={r.contact.email} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{r.contact.name || r.contact.email}</p>
                  <p className="text-xs text-gray-400">{r.contact.email}</p>
                </div>
                <Badge>{r.score}/10</Badge>
              </div>
              <p className="text-sm text-gray-600">{r.reason}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
