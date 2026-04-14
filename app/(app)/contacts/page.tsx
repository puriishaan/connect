"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Contact {
  id: string;
  name: string | null;
  email: string;
  relationshipSummary: string | null;
  lastContactDate: string | null;
  threadCount: number;
  isWorthwhile: boolean;
  enrichedData: { currentRole?: string; company?: string } | null;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/contacts?worthwhile=true&search=${encodeURIComponent(search)}&limit=100`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Connections</h1>
        <span className="text-sm text-gray-400">{contacts.length} contacts</span>
      </div>

      <Input
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : contacts.length === 0 ? (
        <p className="text-gray-400 text-sm">No contacts found.</p>
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => (
            <Card key={c.id} className="p-4 space-y-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{c.name || c.email}</p>
                  <p className="text-xs text-gray-400">{c.email}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {c.enrichedData?.currentRole && (
                    <Badge variant="secondary">{c.enrichedData.currentRole}</Badge>
                  )}
                  <Badge variant="outline">{c.threadCount} threads</Badge>
                </div>
              </div>
              {c.relationshipSummary && (
                <p className="text-sm text-gray-600 line-clamp-2">{c.relationshipSummary}</p>
              )}
              {c.lastContactDate && (
                <p className="text-xs text-gray-400">
                  Last contact: {new Date(c.lastContactDate).toLocaleDateString()}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
