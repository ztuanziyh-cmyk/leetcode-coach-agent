"use client";

import { useState } from "react";

import { Card } from "@/components/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import type { LeetCodeSyncResult } from "@/lib/leetcode";
import {
  clearLocalSyncResult,
  saveLocalSyncResult,
} from "@/lib/local-sync-storage";
import { useLocalSyncResult } from "@/lib/use-local-sync-result";

const DEFAULT_USERNAME = "Graphql";

export function SyncPreview() {
  const storedSync = useLocalSyncResult();
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [result, setResult] = useState<LeetCodeSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentResult = result ?? storedSync?.data ?? null;
  const usingStoredSync = !result && Boolean(storedSync);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/leetcode/sync?username=${encodeURIComponent(username)}`,
        {
          method: "GET",
        },
      );

      const payload = (await response.json()) as
        | { data: LeetCodeSyncResult }
        | { error: string };

      if (!response.ok || !("data" in payload)) {
        setResult(null);
        setError("error" in payload ? payload.error : "Sync failed.");
        return;
      }

      setResult(payload.data);
      saveLocalSyncResult(payload.data);
    } catch {
      setResult(null);
      setError("Unable to reach the sync endpoint.");
    } finally {
      setLoading(false);
    }
  }

  function handleClearLocalSyncData() {
    clearLocalSyncResult();
    setResult(null);
    setError(null);
    setUsername(DEFAULT_USERNAME);
  }

  return (
    <div className="space-y-6">
      <Card
        title="LeetCode sync"
        subtitle="Fetch a public LeetCode profile without login or cookies, then store the latest result locally in this browser."
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">LeetCode username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g. Graphql"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex rounded-full bg-sky-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white"
            >
              {loading ? "Syncing..." : "Sync preview"}
            </button>
            <button
              type="button"
              onClick={handleClearLocalSyncData}
              className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear local sync data
            </button>
            <p className="text-sm text-slate-600">
              Try `Graphql` or any public LeetCode username.
            </p>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <DataSourceBadge live={Boolean(storedSync) || Boolean(result)} />
          <p className="text-sm text-slate-600">
            {storedSync
              ? `Saved locally on ${storedSync.syncedAt.slice(0, 16).replace("T", " ")}`
              : "No synced data saved locally yet."}
          </p>
          <p className="text-sm text-slate-600">
            Recently synced problems are enriched with question metadata when available.
          </p>
        </div>
      </Card>

      {error ? (
        <Card title="Sync error">
          <p className="text-sm leading-7 text-rose-700">{error}</p>
        </Card>
      ) : null}

      {currentResult ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <DataSourceBadge live={Boolean(currentResult)} compact />
            <p className="font-medium text-slate-950">
              {currentResult.realName || currentResult.username}
            </p>
            <p>@{currentResult.username}</p>
            <p>
              Last synced{" "}
              {storedSync?.syncedAt?.slice(0, 16).replace("T", " ") ?? "just now"}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <p>Metadata enriched: {Object.keys(currentResult.problemMetadataBySlug ?? {}).length}</p>
            <p>Recent submissions: {currentResult.recentSubmissions.length}</p>
            <p>{usingStoredSync ? "Loaded from local data." : "Saved locally."}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
