"use client";

import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { ProblemRow } from "@/components/problem-row";
import {
  buildInitialLocalReviewNote,
  getReviewNoteSummary,
} from "@/lib/local-review-notes";
import { getSyncedTrackedProblemDetail } from "@/lib/local-synced-problems";
import { useLocalReviewHistory } from "@/lib/use-local-review-history";
import { useLocalReviewNotes } from "@/lib/use-local-review-notes";
import { useLocalSyncResult } from "@/lib/use-local-sync-result";
import type { getProblemDetail } from "@/lib/review-logic";
import { ReviewNotesForm } from "@/components/review-notes-form";
import { ReviewResultActions } from "@/components/review-result-actions";

type MockProblemDetail = ReturnType<typeof getProblemDetail>;

type ProblemDetailContentProps = {
  slug: string;
  mockDetail: MockProblemDetail;
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

    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.9fr)]">
        <div className="space-y-6">
          <Card title="Problem metadata" subtitle="Loaded from the current fallback problem dataset.">
            <dl className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-slate-500">Topics</dt>
                <dd className="mt-1 leading-6">{problem.topics.join(" • ")}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Acceptance rate</dt>
                <dd className="mt-1">{problem.acceptanceRate}%</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">First solved</dt>
                <dd className="mt-1">{problem.firstSolvedAt?.slice(0, 10)}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Last solved</dt>
                <dd className="mt-1">{problem.lastSolvedAt?.slice(0, 10)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Recent submissions" subtitle="Most recent activity for this single problem.">
            <div className="space-y-3">
              {submissions.length ? (
                submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex flex-col gap-2 rounded-[1.5rem] border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{submission.status}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {submission.submittedAt.slice(0, 16)} • {submission.language}
                      </p>
                    </div>
                    <p className="text-sm text-slate-600">
                      {submission.runtimeMs
                        ? `${submission.runtimeMs} ms • ${submission.memoryMb} MB`
                        : "No runtime or memory captured"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No submissions are available for this problem yet.</p>
              )}
            </div>
          </Card>

          <Card title="Related review candidates" subtitle="Nearby problems that share overlapping topics.">
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
        </div>

        <div className="space-y-6">
          <Card title="Review note" subtitle="Manual metadata that drives the review workflow.">
            {reviewSummary.confidence ||
            reviewSummary.mistakeType ||
            reviewSummary.pattern ||
            reviewSummary.keyTakeaway ||
            reviewSummary.freeformNotes ? (
              <div className="space-y-5 text-sm text-slate-700">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="good">
                    {getConfidenceLabel(reviewSummary.confidence)}
                  </Badge>
                  <Badge>{reviewSummary.reviewState}</Badge>
                  <Badge>{reviewSummary.mistakeType || "No mistake type"}</Badge>
                  <Badge>{reviewSummary.pattern || "No pattern"}</Badge>
                </div>
                <div>
                  <p className="font-medium text-slate-500">Core idea</p>
                  <p className="mt-2 leading-7">{reviewSummary.coreIdea || "Not recorded yet."}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-500">Why missed</p>
                  <p className="mt-2 leading-7">
                    {reviewSummary.whyMissed || "Not recorded yet."}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-slate-500">Key takeaway</p>
                  <p className="mt-2 leading-7">
                    {reviewSummary.keyTakeaway || "Not recorded yet."}
                  </p>
                </div>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-slate-500">Confidence</dt>
                    <dd className="mt-1">{reviewSummary.confidence ?? "—"} / 5</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Next review</dt>
                    <dd className="mt-1">{reviewSummary.nextReviewDate || "Not scheduled"}</dd>
                  </div>
                </dl>
                <div>
                  <p className="font-medium text-slate-500">Freeform notes</p>
                  <p className="mt-2 leading-7">
                    {reviewSummary.freeformNotes || "Not recorded yet."}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-7 text-slate-600">
                No review notes saved yet. Add notes below to start tracking this problem.
              </p>
            )}
          </Card>

          <Card
            title="Edit review notes"
            subtitle="Saved locally by problem slug and reused across the app."
          >
            <ReviewNotesForm
              key={slug}
              initialNote={buildInitialLocalReviewNote(slug, localReviewNote ?? reviewNote)}
            />
          </Card>

          <Card
            title="Log review result"
            subtitle="Use a review result to update confidence, next review date, and review state automatically."
          >
            <ReviewResultActions problemSlug={slug} />
          </Card>

          <Card title="Review history" subtitle="Newest first. Stored locally in this browser.">
            {reviewHistory.length ? (
              <div className="space-y-3">
                {reviewHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[1.5rem] border border-slate-200 p-4 text-sm text-slate-700"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{entry.result}</Badge>
                      <Badge>Before {entry.confidenceBefore ?? "—"}</Badge>
                      <Badge>After {entry.confidenceAfter}</Badge>
                    </div>
                    <p className="mt-2 text-slate-600">
                      {entry.reviewedAt.slice(0, 16)} • Next review {entry.nextReviewDate}
                    </p>
                    {entry.note ? <p className="mt-2 leading-7">{entry.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-slate-600">
                No review history yet. Log a result to start building spaced-repetition history.
              </p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (syncedDetail) {
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
        <div className="space-y-6">
          <Card
            title="Synced problem metadata"
            subtitle="Derived from recent public LeetCode submissions stored locally."
          >
            <div className="space-y-4 text-sm text-slate-700">
              <DataSourceBadge live />
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-500">Difficulty</dt>
                  <dd className="mt-1">{syncedDetail.problem.difficulty}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Tracked status</dt>
                  <dd className="mt-1">{syncedDetail.problem.status}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Question number</dt>
                  <dd className="mt-1">{syncedDetail.problem.questionFrontendId ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Latest status</dt>
                  <dd className="mt-1">{syncedDetail.problem.latestStatus}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Latest submitted</dt>
                  <dd className="mt-1">{syncedDetail.problem.latestSubmittedAt.slice(0, 16)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-slate-500">Topics</dt>
                  <dd className="mt-1">
                    {syncedDetail.problem.topics.length
                      ? syncedDetail.problem.topics.join(" • ")
                      : "Unavailable from recent submissions."}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-slate-500">LeetCode URL</dt>
                  <dd className="mt-1">
                    {syncedDetail.problem.url ? (
                      <a
                        href={syncedDetail.problem.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 hover:text-sky-800"
                      >
                        {syncedDetail.problem.url}
                      </a>
                    ) : (
                      "Unavailable"
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card title="Recent synced submissions" subtitle="Only fields exposed by the public sync are shown here.">
            <div className="space-y-3">
              {syncedDetail.submissions.map((submission) => (
                <div
                  key={`${submission.titleSlug}-${submission.timestamp}-${submission.lang}`}
                  className="flex flex-col gap-2 rounded-[1.5rem] border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{submission.statusDisplay}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatSyncTimestamp(submission.timestamp)} • {submission.lang}
                    </p>
                  </div>
                  <p className="text-sm text-slate-600">{submission.titleSlug}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="Edit review notes"
            subtitle="These notes are saved locally by problem slug for synced-only problems too."
          >
            <ReviewNotesForm
              key={slug}
              initialNote={buildInitialLocalReviewNote(slug, localReviewNote)}
            />
          </Card>

          <Card
            title="Log review result"
            subtitle="Use a review result to update confidence, next review date, and review state automatically."
          >
            <ReviewResultActions problemSlug={slug} />
          </Card>

          <Card title="Review history" subtitle="Newest first. Stored locally in this browser.">
            {reviewHistory.length ? (
              <div className="space-y-3">
                {reviewHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[1.5rem] border border-slate-200 p-4 text-sm text-slate-700"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{entry.result}</Badge>
                      <Badge>Before {entry.confidenceBefore ?? "—"}</Badge>
                      <Badge>After {entry.confidenceAfter}</Badge>
                    </div>
                    <p className="mt-2 text-slate-600">
                      {entry.reviewedAt.slice(0, 16)} • Next review {entry.nextReviewDate}
                    </p>
                    {entry.note ? <p className="mt-2 leading-7">{entry.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-slate-600">
                No review history yet. Log a result to start building spaced-repetition history.
              </p>
            )}
          </Card>
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
        If this problem came from a live sync, open `/sync` and run a sync again to refresh the
        locally stored recent submissions.
      </p>
    </Card>
  );
}
