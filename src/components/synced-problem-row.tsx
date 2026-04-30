import Link from "next/link";

import { Badge } from "@/components/badge";
import { getReviewNoteSummary } from "@/lib/local-review-notes";
import type { LocalReviewNote, SyncedTrackedProblem } from "@/lib/types";

function difficultyTone(difficulty: SyncedTrackedProblem["difficulty"]) {
  if (difficulty === "Easy") {
    return "easy";
  }
  if (difficulty === "Medium") {
    return "medium";
  }
  if (difficulty === "Hard") {
    return "hard";
  }
  return "neutral";
}

export function SyncedProblemRow({
  problem,
  localReviewNote,
}: {
  problem: SyncedTrackedProblem;
  localReviewNote?: LocalReviewNote;
}) {
  const reviewNote = getReviewNoteSummary(localReviewNote);

  return (
    <Link
      href={`/problems/${problem.slug}`}
      className="grid gap-4 rounded-[1.5rem] border border-slate-200 p-4 transition hover:border-sky-300 hover:bg-sky-50/40 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {problem.questionFrontendId ? <Badge>#{problem.questionFrontendId}</Badge> : null}
          <h3 className="text-base font-semibold text-slate-950">{problem.title}</h3>
          <Badge tone={difficultyTone(problem.difficulty)}>{problem.difficulty}</Badge>
          <Badge tone={problem.status === "accepted" ? "good" : "warn"}>
            {problem.status}
          </Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {problem.topics.length
            ? problem.topics.join(" • ")
            : "Topics unavailable from recent submissions."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{reviewNote.reviewState}</Badge>
        <Badge tone={reviewNote.confidence ? "good" : "neutral"}>
          Confidence {reviewNote.confidence ?? "—"}
        </Badge>
        <Badge>{reviewNote.mistakeType || problem.latestStatus}</Badge>
        <Badge>{reviewNote.pattern || "No pattern tagged"}</Badge>
      </div>

      <div className="text-sm leading-6 text-slate-600 md:text-right">
        <p>{reviewNote.nextReviewDate ? "Next review" : "Latest submitted"}</p>
        <p className="font-medium text-slate-900">
          {reviewNote.nextReviewDate || problem.latestSubmittedAt.slice(0, 16)}
        </p>
      </div>
    </Link>
  );
}
