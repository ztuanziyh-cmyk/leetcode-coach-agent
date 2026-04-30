"use client";

import { useState } from "react";

import { logReviewResultForProblem } from "@/lib/local-review-history";
import type { ReviewResult } from "@/lib/types";

const reviewResults: ReviewResult[] = [
  "Forgot",
  "Partial",
  "Remembered",
  "Mastered",
];

type ReviewResultActionsProps = {
  problemSlug: string;
  compact?: boolean;
};

export function ReviewResultActions({
  problemSlug,
  compact = false,
}: ReviewResultActionsProps) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function handleResult(result: ReviewResult) {
    logReviewResultForProblem(problemSlug, result, note);
    setStatus("Review logged.");
    setNote("");
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Optional review note</span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Short note about what happened"
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
        />
      </label>

      <div className={`flex flex-wrap gap-2 ${compact ? "" : "pt-1"}`}>
        {reviewResults.map((result) => (
          <button
            key={result}
            type="button"
            onClick={() => handleResult(result)}
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
          >
            {result}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-600">{status ?? "Log a result to update scheduling."}</p>
    </div>
  );
}
