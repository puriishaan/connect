"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Result {
  contact: { name: string | null; email: string; relationshipSummary: string | null };
  reasoning: string;
  confidence: "high" | "medium" | "low";
}

const confidenceColor: Record<string, string> = {
  high: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-600",
};

export default function ReachOutPage() {
  const [need, setNeed] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!need.trim()) return;
    setLoading(true);
    setSubmitted(false);
    const res = await fetch("/api/modes/reachout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ need }),
    });
    const data = await res.json();
    setResults(data);
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Reach Out</h1>
        <p className="text-sm text-gray-500 mt-1">
          Describe what you need — advice, an introduction, expertise — and we&apos;ll find your best contacts.
        </p>
      </div>

      <div className="space-y-3">
        <Textarea
          placeholder="e.g. I'm looking for advice on breaking into venture capital, or introductions to founders in Southeast Asia..."
          rows={4}
          value={need}
          onChange={(e) => setNeed(e.target.value)}
        />
        <Button onClick={submit} disabled={loading || !need.trim()}>
          {loading ? "Searching your network..." : "Find the right people"}
        </Button>
      </div>

      {submitted && results.length === 0 && (
        <p className="text-sm text-gray-400">No strong matches found. Try rephrasing your need.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 font-medium">Top {results.length} contacts for this</p>
          {results.map((r, i) => (
            <Card key={r.contact.email} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono w-4">{i + 1}.</span>
                  <div>
                    <p className="font-medium">{r.contact.name || r.contact.email}</p>
                    <p className="text-xs text-gray-400">{r.contact.email}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceColor[r.confidence]}`}>
                  {r.confidence}
                </span>
              </div>
              <p className="text-sm text-gray-600">{r.reasoning}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
