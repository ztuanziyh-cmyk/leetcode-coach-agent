"use client";

import { useState } from "react";

import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { LiveSubmissionList } from "@/components/live-submission-list";
import { StatCard } from "@/components/stat-card";
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
        title="Public username sync"
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
              className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total solved"
              value={currentResult.totalSolved}
              detail={`${currentResult.easySolved} easy • ${currentResult.mediumSolved} medium • ${currentResult.hardSolved} hard`}
            />
            <StatCard
              label="Ranking"
              value={currentResult.ranking ?? "—"}
              detail="Live public ranking from LeetCode profile data."
            />
            <StatCard
              label="Recent submissions"
              value={currentResult.recentSubmissions.length}
              detail="Returned from the public recent submission list when available."
            />
            <StatCard
              label="Metadata enriched"
              value={Object.keys(currentResult.problemMetadataBySlug ?? {}).length}
              detail="Recently synced problems enriched with question metadata."
            />
          </div>

          <Card title="Result summary" subtitle="This is the live payload normalized for the app.">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              {currentResult.userAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentResult.userAvatar}
                  alt={`${currentResult.username} avatar`}
                  className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
                />
              ) : null}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                    {currentResult.realName || currentResult.username}
                  </h3>
                  <Badge tone="good">@{currentResult.username}</Badge>
                  <DataSourceBadge live={Boolean(currentResult)} compact />
                </div>
                <p className="text-sm leading-7 text-slate-600">
                  {usingStoredSync
                    ? "This sync result was restored from local data and is available across the app."
                    : "The latest successful sync is saved locally and is now available across the app."}
                </p>
              </div>
            </div>
          </Card>

          <Card
            title="Recent submissions preview"
            subtitle="The public feed can contain accepted and non-accepted attempts."
          >
            <LiveSubmissionList submissions={currentResult.recentSubmissions} limit={12} />
          </Card>
        </>
      ) : null}
    </div>
  );
}
