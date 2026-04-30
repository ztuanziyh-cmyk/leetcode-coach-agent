"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { ProblemRow } from "@/components/problem-row";
import { ReviewNotesForm } from "@/components/review-notes-form";
import { ReviewResultActions } from "@/components/review-result-actions";
import {
  buildInitialLocalReviewNote,
  getReviewNoteSummary,
} from "@/lib/local-review-notes";
import { getSyncedTrackedProblemDetail } from "@/lib/local-synced-problems";
import { useLocalReviewHistory } from "@/lib/use-local-review-history";
import { useLocalReviewNotes } from "@/lib/use-local-review-notes";
import { useLocalSyncResult } from "@/lib/use-local-sync-result";
import type { getProblemDetail } from "@/lib/review-logic";
import type {
  LocalReviewHistoryRecord,
  ReviewNote,
  ReviewNoteSummary,
  Submission,
  SyncedTrackedProblem,
} from "@/lib/types";

type MockProblemDetail = ReturnType<typeof getProblemDetail>;

type ProblemDetailContentProps = {
  slug: string;
  mockDetail: MockProblemDetail;
};

type SummaryProblem = {
  title: string;
  slug: string;
  questionFrontendId?: string;
  difficulty: string;
  topics: string[];
  latestStatus?: string;
  url?: string;
};

type MetadataRow = {
  label: string;
  value: ReactNode;
};

function getConfidenceLabel(confidence?: number | null) {
  if (!confidence) {
    return "Unreviewed";
  }
  if (confidence <= 2) {
    return "Fragile";
  }
  if (confidence === 3) {
    return "Shaky";
  }
  return "Solid";
}

function formatSyncTimestamp(timestamp: string) {
  return new Date(Number(timestamp) * 1000).toISOString().slice(0, 16);
}

function getDifficultyTone(difficulty?: string) {
  if (difficulty === "Easy") {
    return "easy" as const;
  }
  if (difficulty === "Medium") {
    return "medium" as const;
  }
  if (difficulty === "Hard") {
    return "hard" as const;
  }
  return "neutral" as const;
}

function getStatusTone(status?: string) {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("accepted") || normalized.includes("mastered") || normalized === "solved") {
    return "good" as const;
  }
  if (
    normalized.includes("wrong") ||
    normalized.includes("time limit") ||
    normalized.includes("runtime") ||
    normalized.includes("forgot")
  ) {
    return "bad" as const;
  }
  if (
    normalized.includes("review") ||
    normalized.includes("partial") ||
    normalized.includes("attempted")
  ) {
    return "warn" as const;
  }
  return "neutral" as const;
}

function LeetCodeLink({ url }: { url?: string }) {
  if (!url) {
    return <span className="text-slate-500">Unavailable</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center rounded-full border border-sky-200 px-3 py-1.5 text-xs font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-50"
    >
      Open LeetCode
    </a>
  );
}

function ProblemSummaryCard({
  problem,
  reviewSummary,
}: {
  problem: SummaryProblem;
  reviewSummary: ReviewNoteSummary;
}) {
  return (
    <Card className="!p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {problem.questionFrontendId ? (
              <Badge>#{problem.questionFrontendId}</Badge>
            ) : null}
            <Badge tone={getDifficultyTone(problem.difficulty)}>{problem.difficulty}</Badge>
            <Badge tone={getStatusTone(reviewSummary.reviewState)}>
              {reviewSummary.reviewState}
            </Badge>
            <Badge tone={reviewSummary.confidence && reviewSummary.confidence >= 4 ? "good" : "neutral"}>
              {getConfidenceLabel(reviewSummary.confidence)}
            </Badge>
            {reviewSummary.nextReviewDate ? (
              <Badge tone="warn">Next {reviewSummary.nextReviewDate}</Badge>
            ) : null}
            {problem.latestStatus ? (
              <Badge tone={getStatusTone(problem.latestStatus)}>
                Latest {problem.latestStatus}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {problem.title}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {problem.topics.length ? (
              problem.topics.slice(0, 8).map((topic) => (
                <Badge key={topic}>{topic}</Badge>
              ))
            ) : (
              <span className="text-sm text-slate-500">Topics unavailable</span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <LeetCodeLink url={problem.url} />
        </div>
      </div>
    </Card>
  );
}

function MetadataCard({
  title,
  subtitle,
  live,
  rows,
}: {
  title: string;
  subtitle: string;
  live: boolean;
  rows: MetadataRow[];
}) {
  return (
    <Card title={title} subtitle={subtitle} className="!p-5">
      <div className="mb-4">
        <DataSourceBadge live={live} />
      </div>
      <dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0 border-b border-slate-100 pb-3 last:border-0">
            <dt className="text-xs font-medium uppercase text-slate-500">{row.label}</dt>
            <dd className="mt-1 break-words text-slate-800">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function TopicList({ topics }: { topics: string[] }) {
  if (!topics.length) {
    return <span className="text-slate-500">Unavailable</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {topics.map((topic) => (
        <Badge key={topic}>{topic}</Badge>
      ))}
    </div>
  );
}

function MockSubmissionsCard({ submissions }: { submissions: Submission[] }) {
  const visibleSubmissions = submissions.slice(0, 5);

  return (
    <Card title="Recent submissions" subtitle="Latest activity for this problem." className="!p-5">
      {visibleSubmissions.length ? (
        <div className="space-y-2">
          {visibleSubmissions.map((submission) => (
            <div
              key={submission.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={getStatusTone(submission.status)}>{submission.status}</Badge>
                  <span className="text-xs text-slate-500">
                    {submission.submittedAt.slice(0, 16)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{submission.language ?? "Unknown language"}</p>
              </div>
              <p className="text-xs text-slate-600">
                {submission.runtimeMs
                  ? `${submission.runtimeMs} ms / ${submission.memoryMb} MB`
                  : "Runtime unavailable"}
              </p>
            </div>
          ))}
          {submissions.length > visibleSubmissions.length ? (
            <Link href="/submissions" className="inline-flex text-sm font-medium text-sky-700 hover:text-sky-800">
              View all submissions
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-600">No submissions are available for this problem yet.</p>
      )}
    </Card>
  );
}

function SyncedSubmissionsCard({
  submissions,
}: {
  submissions: NonNullable<ReturnType<typeof getSyncedTrackedProblemDetail>>["submissions"];
}) {
  const visibleSubmissions = submissions.slice(0, 5);

  return (
    <Card title="Recent submissions" subtitle="Public LeetCode sync data for this problem." className="!p-5">
      {visibleSubmissions.length ? (
        <div className="space-y-2">
          {visibleSubmissions.map((submission) => (
            <div
              key={`${submission.titleSlug}-${submission.timestamp}-${submission.lang}`}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={getStatusTone(submission.statusDisplay)}>
                    {submission.statusDisplay}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {formatSyncTimestamp(submission.timestamp)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-600">{submission.titleSlug}</p>
              </div>
              <p className="text-xs text-slate-600">{submission.lang}</p>
            </div>
          ))}
          {submissions.length > visibleSubmissions.length ? (
            <Link href="/submissions" className="inline-flex text-sm font-medium text-sky-700 hover:text-sky-800">
              View all submissions
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-600">No synced submissions are available for this problem yet.</p>
      )}
    </Card>
  );
}

function ReviewHistoryCard({ reviewHistory }: { reviewHistory: LocalReviewHistoryRecord[] }) {
  return (
    <Card title="Review history" subtitle="Newest first. Stored locally in this browser." className="!p-5">
      {reviewHistory.length ? (
        <div className="space-y-2">
          {reviewHistory.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={getStatusTone(entry.result)}>{entry.result}</Badge>
                <Badge>Before {entry.confidenceBefore ?? "-"}</Badge>
                <Badge>After {entry.confidenceAfter}</Badge>
                <span className="text-xs text-slate-500">{entry.reviewedAt.slice(0, 16)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">Next review {entry.nextReviewDate}</p>
              {entry.note ? <p className="mt-2 leading-6">{entry.note}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          No review history yet. Log a result to start building spaced-repetition history.
        </p>
      )}
    </Card>
  );
}

function EditorColumn({
  slug,
  initialNote,
}: {
  slug: string;
  initialNote: Parameters<typeof ReviewNotesForm>[0]["initialNote"];
}) {
  return (
    <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
      <Card
        title="Edit review notes"
        subtitle="Saved locally by problem slug and reused across the app."
        className="!p-5"
      >
        <ReviewNotesForm key={slug} initialNote={initialNote} />
      </Card>

      <Card
        title="Log review result"
        subtitle="Updates confidence, review state, and next review date."
        className="!p-5"
      >
        <ReviewResultActions problemSlug={slug} compact />
      </Card>
    </div>
  );
}

function RelatedProblemsCard({
  relatedProblems,
  localReviewNotes,
}: {
  relatedProblems: NonNullable<MockProblemDetail>["relatedProblems"];
  localReviewNotes: ReturnType<typeof useLocalReviewNotes>;
}) {
  if (!relatedProblems.length) {
    return null;
  }

  return (
    <Card title="Related review candidates" subtitle="Problems with overlapping topics." className="!p-5">
      <div className="space-y-3">
        {relatedProblems.map((relatedProblem) => (
          <ProblemRow
            key={relatedProblem.slug}
            problem={relatedProblem}
            localReviewNote={localReviewNotes[relatedProblem.slug]}
          />
        ))}
      </div>
    </Card>
  );
}

function buildMockMetadataRows(
  problem: NonNullable<MockProblemDetail>["problem"],
): MetadataRow[] {
  return [
    { label: "Slug", value: problem.slug },
    { label: "Acceptance", value: problem.acceptanceRate ? `${problem.acceptanceRate}%` : "Unknown" },
    { label: "First solved", value: problem.firstSolvedAt?.slice(0, 10) ?? "Unknown" },
    { label: "Last solved", value: problem.lastSolvedAt?.slice(0, 10) ?? "Unknown" },
    { label: "Topics", value: <TopicList topics={problem.topics} /> },
    { label: "LeetCode", value: <LeetCodeLink url={problem.url} /> },
  ];
}

function buildSyncedMetadataRows(problem: SyncedTrackedProblem): MetadataRow[] {
  return [
    { label: "Slug", value: problem.slug },
    { label: "Question", value: problem.questionFrontendId ?? "Unknown" },
    { label: "Tracked status", value: <Badge tone={getStatusTone(problem.status)}>{problem.status}</Badge> },
    { label: "Latest submitted", value: problem.latestSubmittedAt.slice(0, 16) },
    { label: "Topics", value: <TopicList topics={problem.topics} /> },
    { label: "LeetCode", value: <LeetCodeLink url={problem.url} /> },
  ];
}

export function ProblemDetailContent({
  slug,
  mockDetail,
}: ProblemDetailContentProps) {
  const storedSync = useLocalSyncResult();
  const localReviewNotes = useLocalReviewNotes();
  const localReviewHistory = useLocalReviewHistory();
  const syncedDetail = getSyncedTrackedProblemDetail(storedSync?.data, slug);
  const localReviewNote = localReviewNotes[slug];
  const reviewHistory = localReviewHistory[slug] ?? [];

  if (mockDetail) {
    const { problem, reviewNote, submissions, relatedProblems } = mockDetail;
    const reviewSummary = getReviewNoteSummary(localReviewNote, reviewNote);
    const latestSubmission = submissions[0];

    return (
      <div className="space-y-6">
        <ProblemSummaryCard
          problem={{
            title: problem.title,
            slug: problem.slug,
            difficulty: problem.difficulty,
            topics: problem.topics,
            latestStatus: latestSubmission?.status,
            url: problem.url,
          }}
          reviewSummary={reviewSummary}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <div className="space-y-5">
            <MetadataCard
              title="Problem metadata"
              subtitle="Loaded from the fallback problem dataset."
              live={false}
              rows={buildMockMetadataRows(problem)}
            />
            <MockSubmissionsCard submissions={submissions} />
            <RelatedProblemsCard
              relatedProblems={relatedProblems}
              localReviewNotes={localReviewNotes}
            />
            <ReviewHistoryCard reviewHistory={reviewHistory} />
          </div>

          <EditorColumn
            slug={slug}
            initialNote={buildInitialLocalReviewNote(
              slug,
              localReviewNote ?? (reviewNote as ReviewNote | undefined),
            )}
          />
        </div>
      </div>
    );
  }

  if (syncedDetail) {
    const reviewSummary = getReviewNoteSummary(localReviewNote);

    return (
      <div className="space-y-6">
        <ProblemSummaryCard
          problem={{
            title: syncedDetail.problem.title,
            slug: syncedDetail.problem.slug,
            questionFrontendId: syncedDetail.problem.questionFrontendId,
            difficulty: syncedDetail.problem.difficulty,
            topics: syncedDetail.problem.topics,
            latestStatus: syncedDetail.problem.latestStatus,
            url: syncedDetail.problem.url,
          }}
          reviewSummary={reviewSummary}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <div className="space-y-5">
            <MetadataCard
              title="Problem metadata"
              subtitle="Derived from recent public LeetCode submissions stored locally."
              live
              rows={buildSyncedMetadataRows(syncedDetail.problem)}
            />
            <SyncedSubmissionsCard submissions={syncedDetail.submissions} />
            <ReviewHistoryCard reviewHistory={reviewHistory} />
          </div>

          <EditorColumn
            slug={slug}
            initialNote={buildInitialLocalReviewNote(slug, localReviewNote)}
          />
        </div>
      </div>
    );
  }

  return (
    <Card
      title="Problem not found"
      subtitle="No matching problem was found in local synced data or the fallback dataset."
    >
      <p className="text-sm leading-7 text-slate-600">
        If this problem came from a live sync, open Settings and run a sync again to refresh the
        locally stored recent submissions.
      </p>
    </Card>
  );
}
