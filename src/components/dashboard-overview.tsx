"use client";

import Link from "next/link";

import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { DataSourceBadge } from "@/components/data-source-badge";
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

      <Card title="Profile overview">
        <div className="flex flex-col gap-4 text-sm text-slate-700 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-950">{profile.displayName}</p>
            <p className="mt-1">@{profile.username}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DataSourceBadge live={usingLiveData} compact />
            <Badge tone="good">{profile.totalSolved ?? 0} solved</Badge>
            <Badge>Ranking {profile.ranking ?? "—"}</Badge>
            <Badge>
              Last synced {profile.lastSyncedAt?.slice(0, 10) ?? "Not synced"}
            </Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Daily review preview" subtitle="Highest-priority items should be one click away.">
          <div className="space-y-3">
            {fallbackData.weakTopics.slice(0, 3).map((topic) => (
              <TopicMeter key={topic.topic} {...topic} />
            ))}
          </div>
          <Link
            href="/review"
            className="mt-5 inline-flex rounded-full bg-sky-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800"
          >
            Open daily review
          </Link>
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
