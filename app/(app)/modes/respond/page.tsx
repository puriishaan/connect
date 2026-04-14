"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Thread {
  id: string;
  subject: string | null;
  summary: string | null;
  snippet: string | null;
  lastMessageAt: string | null;
  contact: {
    id: string;
    name: string | null;
    email: string;
    relationshipSummary: string | null;
  } | null;
}

export default function RespondPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/modes/respond")
      .then((r) => r.json())
      .then((data) => { setThreads(data); setLoading(false); });
  }, []);

  const daysSince = (date: string) =>
    Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Respond</h1>
        <p className="text-sm text-gray-500 mt-1">Emails from important contacts waiting for your reply</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : threads.length === 0 ? (
        <p className="text-gray-400 text-sm">All clear — no pending replies from important contacts.</p>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <Card key={thread.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{thread.subject || "(no subject)"}</p>
                  <p className="text-xs text-gray-400">
                    from {thread.contact?.name || thread.contact?.email || "unknown"}
                  </p>
                </div>
                {thread.lastMessageAt && (
                  <Badge variant="outline" className="flex-shrink-0">
                    {daysSince(thread.lastMessageAt)}d ago
                  </Badge>
                )}
              </div>

              {thread.summary && (
                <p className="text-sm text-gray-600">{thread.summary}</p>
              )}

              {!thread.summary && thread.snippet && (
                <p className="text-sm text-gray-500 italic">&ldquo;{thread.snippet}&rdquo;</p>
              )}

              {thread.contact?.relationshipSummary && (
                <p className="text-xs text-gray-400 border-t pt-2 line-clamp-1">
                  {thread.contact.relationshipSummary}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
