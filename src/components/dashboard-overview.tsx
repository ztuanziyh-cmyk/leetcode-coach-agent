"use client";

import Link from "next/link";

import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { LiveSubmissionList } from "@/components/live-submission-list";
import { StatCard } from "@/components/stat-card";
import { TopicMeter } from "@/components/topic-meter";
import { getDashboardData } from "@/lib/review-logic";
import { useLocalSyncResult } from "@/lib/use-local-sync-result";

const fallbackData = getDashboardData();

export function DashboardOverview() {
  const storedSync = useLocalSyncResult();

  const liveSync = storedSync?.data;
  const usingLiveData = Boolean(liveSync);
  const profile = liveSync
    ? {
        username: liveSync.username,
        displayName: liveSync.realName || liveSync.username,
        totalSolved: liveSync.totalSolved,
        easySolved: liveSync.easySolved,
        mediumSolved: liveSync.mediumSolved,
        hardSolved: liveSync.hardSolved,
        ranking: liveSync.ranking,
        lastSyncedAt: storedSync?.syncedAt,
      }
    : fallbackData.userProfile;

  const recentSubmissions = liveSync?.recentSubmissions ?? [];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Solved total"
          value={profile.totalSolved ?? 0}
          detail={`${profile.easySolved ?? 0} easy • ${profile.mediumSolved ?? 0} medium • ${profile.hardSolved ?? 0} hard`}
        />
        <StatCard
          label="Tracked reviews"
          value={fallbackData.reviewTrackedCount}
          detail="Problems with confidence, pattern, and takeaway notes."
        />
        <StatCard
          label="Today’s queue"
          value={fallbackData.todayReviewCount}
          detail={`${fallbackData.overdueCount} items are already overdue for review.`}
        />
        <StatCard
          label="Ranking"
          value={profile.ranking ?? "—"}
          detail={
            usingLiveData
              ? "Live public profile ranking from the latest local sync."
              : "Profile ranking from the current local data source."
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card title="Daily review preview" subtitle="Highest-priority items should be one click away.">
          <div className="space-y-3">
            {fallbackData.weakTopics.slice(0, 3).map((topic) => (
              <TopicMeter key={topic.topic} {...topic} />
            ))}
          </div>
          <Link
            href="/review"
            className="mt-5 inline-flex rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Open daily review
          </Link>
        </Card>

        <Card
          title="Sync profile"
          subtitle="Profile stats prefer locally synced LeetCode data when it exists."
        >
          <div className="space-y-4 text-sm text-slate-700">
            <DataSourceBadge live={usingLiveData} />
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-950">{profile.displayName}</p>
              <p className="mt-1">@{profile.username}</p>
              <p className="mt-2 text-sm text-slate-600">
                Last synced {profile.lastSyncedAt?.slice(0, 10) ?? "Not synced locally"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="good">Public sync only</Badge>
              <Badge>No auth</Badge>
              <Badge>LocalStorage persisted</Badge>
            </div>
            <p className="leading-7">
              Profile totals and recent activity come from the latest local sync when available,
              while the rest of the workspace stays usable with fallback sample data.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card
          title="Recent submissions"
          subtitle={
            usingLiveData
              ? "Live local submission preview from the most recent username sync."
              : "Fallback submission feed shown until a live sync is available."
          }
        >
          <div className="mb-4">
            <DataSourceBadge live={usingLiveData} compact />
          </div>
          {usingLiveData ? (
            <LiveSubmissionList submissions={recentSubmissions} limit={8} />
          ) : (
            <div className="space-y-3">
              {fallbackData.recentSubmissions.map((submission) => (
                <div key={submission.id}>
                  <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 p-4 md:grid-cols-[minmax(0,1.2fr)_auto_auto_auto] md:items-center">
                    <div>
                      <Link
                        href={`/problems/${submission.problemSlug}`}
                        className="text-base font-semibold text-slate-950 hover:text-sky-700"
                      >
                        {submission.problem.title}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">
                        {submission.submittedAt.slice(0, 16)}
                      </p>
                    </div>
                    <Badge tone={submission.status === "Accepted" ? "good" : "bad"}>
                      {submission.status}
                    </Badge>
                    <p className="text-sm text-slate-600">{submission.language ?? "TypeScript"}</p>
                    <p className="text-sm text-slate-600">
                      {submission.runtimeMs ? `${submission.runtimeMs} ms` : "No runtime"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Weak topic watchlist" subtitle="Topics with low confidence and recent misses rise first.">
          <div className="space-y-4">
            {fallbackData.weakTopics.map((topic) => (
              <TopicMeter key={topic.topic} {...topic} />
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
