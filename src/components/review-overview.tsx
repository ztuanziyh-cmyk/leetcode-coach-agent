"use client";

import Link from "next/link";

import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { deriveTrackedProblemsFromSync } from "@/lib/local-synced-problems";
import { getReviewNoteSummary } from "@/lib/local-review-notes";
import { getDailyReviewItems, getProblemsList } from "@/lib/review-logic";
import { useLocalReviewNotes } from "@/lib/use-local-review-notes";
import { useLocalSyncResult } from "@/lib/use-local-sync-result";
import { ReviewResultActions } from "@/components/review-result-actions";

const fallbackReviewItems = getDailyReviewItems();
const fallbackProblems = getProblemsList();
const today = "2026-04-29";

function reviewStatePriority(reviewState: string) {
  if (reviewState === "Need Review") {
    return 0;
  }
  if (reviewState === "Reviewing") {
    return 1;
  }
  if (reviewState === "New") {
    return 2;
  }
  return 3;
}

export function ReviewOverview() {
  const storedSync = useLocalSyncResult();
  const localReviewNotes = useLocalReviewNotes();
  const syncedProblems = deriveTrackedProblemsFromSync(storedSync?.data);

  const problemBySlug = new Map<
    string,
    {
      title: string;
      slug: string;
      difficulty: string;
      topics: string[];
    }
  >();

  fallbackProblems.forEach((problem) => {
    problemBySlug.set(problem.slug, {
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      topics: problem.topics,
    });
  });

  syncedProblems.forEach((problem) => {
    if (!problemBySlug.has(problem.slug)) {
      problemBySlug.set(problem.slug, {
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty,
        topics: problem.topics,
      });
    }
  });

  const localDueItems = Object.values(localReviewNotes)
    .filter(
      (note) =>
        note.reviewState !== "Mastered" &&
        ((note.nextReviewDate && note.nextReviewDate <= today) ||
          note.reviewState === "Need Review" ||
          note.reviewState === "Reviewing" ||
          (note.confidence !== null && note.confidence <= 2)),
    )
    .map((note) => {
      const problem = problemBySlug.get(note.problemSlug);

      return problem
        ? {
            id: `local-${note.problemSlug}`,
            problem,
            reviewNote: getReviewNoteSummary(note),
          }
        : null;
    })
    .filter((item) => item !== null)
    .sort((left, right) => {
      const stateDelta =
        reviewStatePriority(left.reviewNote.reviewState) -
        reviewStatePriority(right.reviewNote.reviewState);

      if (stateDelta !== 0) {
        return stateDelta;
      }

      const dueDelta = left.reviewNote.nextReviewDate.localeCompare(right.reviewNote.nextReviewDate);
      if (dueDelta !== 0) {
        return dueDelta;
      }

      const leftConfidence = left.reviewNote.confidence ?? 99;
      const rightConfidence = right.reviewNote.confidence ?? 99;
      return leftConfidence - rightConfidence;
    });

  const usingLocalReviewNotes = localDueItems.length > 0;
  const fallbackVisibleItems = fallbackReviewItems.filter((item) => {
    const localNote = localReviewNotes[item.problem.slug];

    if (!localNote) {
      return true;
    }

    if (localNote.reviewState === "Mastered") {
      return false;
    }

    return (
      localNote.reviewState === "Need Review" ||
      localNote.reviewState === "Reviewing" ||
      (localNote.nextReviewDate && localNote.nextReviewDate <= today) ||
      (localNote.confidence !== null && localNote.confidence <= 2)
    );
  });
  const completedCount = usingLocalReviewNotes
    ? 0
    : fallbackVisibleItems.filter((item) => item.completed).length;

  return (
    <>
      <Card title="Priority rules" subtitle="Local notes due today or earlier are prioritized when available.">
        <div className="flex flex-wrap gap-2 text-sm text-slate-700">
          <span className="rounded-full bg-slate-100 px-3 py-2">Due date today or earlier</span>
          <span className="rounded-full bg-slate-100 px-3 py-2">Confidence 1-2 stays visible</span>
          <span className="rounded-full bg-slate-100 px-3 py-2">Fallback queue remains available</span>
        </div>
      </Card>

      <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {usingLocalReviewNotes
          ? `${localDueItems.length} due from local review notes`
          : `${completedCount} completed • ${fallbackReviewItems.length - completedCount} remaining`}
      </div>

      <div className="space-y-4">
        {!usingLocalReviewNotes && fallbackVisibleItems.length === 0 ? (
          <Card title="No due reviews" subtitle="Nothing is currently due in this browser.">
            <p className="text-sm leading-7 text-slate-600">
              Add review notes, sync more recent submissions, or log another review result to build
              your next queue.
            </p>
          </Card>
        ) : null}
        {usingLocalReviewNotes
          ? localDueItems.map((item) => (
              <Card key={item.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/problems/${item.problem.slug}`}
                        className="text-lg font-semibold tracking-tight text-slate-950 hover:text-sky-700"
                      >
                        {item.problem.title}
                      </Link>
                      <Badge>{item.problem.difficulty}</Badge>
                      <Badge tone="warn">Due</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.problem.topics.length
                        ? item.problem.topics.join(" • ")
                        : "Topics unavailable"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge>{item.reviewNote.reviewState}</Badge>
                      <Badge>Confidence {item.reviewNote.confidence ?? "—"}</Badge>
                      <Badge>{item.reviewNote.mistakeType || "No mistake type"}</Badge>
                      <Badge>{item.reviewNote.pattern || "No pattern"}</Badge>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-medium text-slate-950">
                      Next review {item.reviewNote.nextReviewDate}
                    </p>
                    <p className="mt-1">
                      {item.reviewNote.keyTakeaway || "No key takeaway saved yet."}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <ReviewResultActions problemSlug={item.problem.slug} compact />
                </div>
              </Card>
            ))
          : fallbackVisibleItems.map((item) => (
              <Card key={item.id}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/problems/${item.problem.slug}`}
                        className="text-lg font-semibold tracking-tight text-slate-950 hover:text-sky-700"
                      >
                        {item.problem.title}
                      </Link>
                      <Badge>{item.problem.difficulty}</Badge>
                      <Badge tone={item.completed ? "good" : "warn"}>
                        {item.completed ? "Reviewed" : "Pending"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.problem.topics.join(" • ")}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.reasons.map((reason) => (
                        <Badge key={reason}>{reason}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="font-medium text-slate-950">Priority {item.priorityScore}</p>
                    <p className="mt-1">Next review {item.reviewNote?.nextReviewAt?.slice(0, 10)}</p>
                    <p className="mt-1">Confidence {item.reviewNote?.confidence ?? "—"} / 5</p>
                  </div>
                </div>
                <div className="mt-4">
                  <ReviewResultActions problemSlug={item.problem.slug} compact />
                </div>
              </Card>
            ))}
      </div>
    </>
  );
}
