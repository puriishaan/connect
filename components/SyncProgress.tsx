"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SyncStatus {
  status: string;
  progress: number;
  contactsFound: number;
  lastSyncedAt: string | null;
}

export default function SyncProgress() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const router = useRouter();

  useEffect(() => {
    const poll = async () => {
      const res = await fetch("/api/sync/status");
      if (!res.ok) return;
      const data: SyncStatus = await res.json();
      setStatus(data);
      if (data.status === "complete") router.refresh();
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [router]);

  if (!status) return null;

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>
          {status.status === "syncing" && "Syncing your Gmail..."}
          {status.status === "complete" && `Done — ${status.contactsFound} connections found`}
          {status.status === "error" && "Sync failed. Please try again."}
          {status.status === "idle" && "Ready to sync"}
        </span>
        <span>{status.progress}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-black h-2 rounded-full transition-all duration-500"
          style={{ width: `${status.progress}%` }}
        />
      </div>
      {status.contactsFound > 0 && (
        <p className="text-xs text-gray-400">{status.contactsFound} worthwhile connections identified so far</p>
      )}
    </div>
  );
}
