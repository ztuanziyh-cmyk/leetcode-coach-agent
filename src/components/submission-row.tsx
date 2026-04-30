import Link from "next/link";

import { Badge } from "@/components/badge";
import type { Problem, Submission } from "@/lib/types";

function statusTone(status: Submission["status"]) {
  if (status === "Accepted") {
    return "good";
  }
  if (status === "Wrong Answer" || status === "Runtime Error") {
    return "bad";
  }
  return "warn";
}

export function SubmissionRow({
  submission,
  problem,
}: {
  submission: Submission;
  problem: Problem;
}) {
  return (
    <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 p-4 md:grid-cols-[minmax(0,1.2fr)_auto_auto_auto] md:items-center">
      <div>
        <Link
          href={`/problems/${submission.problemSlug}`}
          className="text-base font-semibold text-slate-950 hover:text-sky-700"
        >
          {problem.title}
        </Link>
        <p className="mt-1 text-sm text-slate-600">{submission.submittedAt.slice(0, 16)}</p>
      </div>
      <Badge tone={statusTone(submission.status)}>{submission.status}</Badge>
      <p className="text-sm text-slate-600">{submission.language ?? "TypeScript"}</p>
      <p className="text-sm text-slate-600">
        {submission.runtimeMs ? `${submission.runtimeMs} ms` : "No runtime"}
      </p>
    </div>
  );
}
