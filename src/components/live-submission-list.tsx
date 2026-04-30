import { Badge } from "@/components/badge";
import type { LeetCodeSyncSubmission } from "@/lib/leetcode";

function formatTimestamp(timestamp: string) {
  const date = new Date(Number(timestamp) * 1000);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusTone(status: string) {
  if (status === "Accepted") {
    return "good";
  }
  if (status === "Wrong Answer" || status === "Runtime Error") {
    return "bad";
  }
  return "warn";
}

export function LiveSubmissionList({
  submissions,
  emptyMessage,
  limit,
}: {
  submissions: LeetCodeSyncSubmission[];
  emptyMessage?: string;
  limit?: number;
}) {
  const items = typeof limit === "number" ? submissions.slice(0, limit) : submissions;

  if (!items.length) {
    return (
      <p className="text-sm leading-7 text-slate-600">
        {emptyMessage ?? "No recent public submissions were returned for this user."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((submission) => (
        <div
          key={`${submission.titleSlug}-${submission.timestamp}-${submission.lang}`}
          className="grid gap-3 rounded-[1.5rem] border border-slate-200 p-4 md:grid-cols-[minmax(0,1.4fr)_auto_auto] md:items-center"
        >
          <div>
            <p className="text-base font-semibold text-slate-950">{submission.title}</p>
            <p className="mt-1 text-sm text-slate-600">
              {submission.titleSlug} • {formatTimestamp(submission.timestamp)}
            </p>
          </div>
          <Badge tone={statusTone(submission.statusDisplay)}>{submission.statusDisplay}</Badge>
          <p className="text-sm text-slate-600">{submission.lang}</p>
        </div>
      ))}
    </div>
  );
}
