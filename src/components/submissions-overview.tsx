"use client";

import { Card } from "@/components/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { LiveSubmissionList } from "@/components/live-submission-list";
import { SubmissionRow } from "@/components/submission-row";
import { getRecentSubmissions } from "@/lib/review-logic";
import { useLocalSyncResult } from "@/lib/use-local-sync-result";

const fallbackSubmissions = getRecentSubmissions();

export function SubmissionsOverview() {
  const storedSync = useLocalSyncResult();

  const liveSubmissions = storedSync?.data.recentSubmissions ?? [];
  const usingLiveData = Boolean(storedSync);

  const acceptedCount = usingLiveData
    ? liveSubmissions.filter((submission) => submission.statusDisplay === "Accepted").length
    : fallbackSubmissions.filter((submission) => submission.status === "Accepted").length;

  const totalCount = usingLiveData ? liveSubmissions.length : fallbackSubmissions.length;

  return (
    <>
      <Card title="Submission timeline" subtitle="Recent submissions prefer live synced local data when available.">
        <div className="mb-4 flex flex-wrap gap-3">
          <DataSourceBadge live={usingLiveData} />
          <p className="text-sm text-slate-600">
            {acceptedCount} accepted • {totalCount - acceptedCount} misses
          </p>
        </div>

        {usingLiveData ? (
          <LiveSubmissionList submissions={liveSubmissions} />
        ) : (
          <div className="space-y-3">
            {fallbackSubmissions.map((submission) => (
              <SubmissionRow
                key={submission.id}
                submission={submission}
                problem={submission.problem}
              />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
