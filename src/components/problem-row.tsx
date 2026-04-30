import Link from "next/link";

import { Badge } from "@/components/badge";
import { getReviewNoteSummary } from "@/lib/local-review-notes";
import type { LocalReviewNote, ProblemWithReview } from "@/lib/types";

function difficultyTone(difficulty: ProblemWithReview["difficulty"]) {
  if (difficulty === "Easy") {
    return "easy";
  }
  if (difficulty === "Medium") {
    return "medium";
  }
  return "hard";
}

function confidenceTone(confidence?: number | null) {
  if (!confidence) {
    return "neutral";
  }
  if (confidence >= 4) {
    return "good";
  }
  if (confidence === 3) {
    return "warn";
  }
  return "bad";
}

export function ProblemRow({
  problem,
  localReviewNote,
}: {
  problem: ProblemWithReview;
  localReviewNote?: LocalReviewNote;
}) {
  const reviewNote = getReviewNoteSummary(localReviewNote, problem.reviewNote);

  return (
    <Link
      href={`/problems/${problem.slug}`}
      className="grid gap-4 rounded-[1.5rem] border border-slate-200 p-4 transition hover:border-sky-300 hover:bg-sky-50/40 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-slate-950">{problem.title}</h3>
          <Badge tone={difficultyTone(problem.difficulty)}>{problem.difficulty}</Badge>
          <Badge>{problem.status}</Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{problem.topics.join(" • ")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{reviewNote.reviewState}</Badge>
        <Badge tone={confidenceTone(reviewNote.confidence)}>
          Confidence {reviewNote.confidence ?? "—"}
        </Badge>
        <Badge>{reviewNote.mistakeType || "No notes yet"}</Badge>
        <Badge>{reviewNote.pattern || "No pattern tagged"}</Badge>
      </div>

      <div className="text-sm leading-6 text-slate-600 md:text-right">
        <p>Next review</p>
        <p className="font-medium text-slate-900">
          {reviewNote.nextReviewDate || "Not scheduled"}
        </p>
      </div>
    </Link>
  );
}
