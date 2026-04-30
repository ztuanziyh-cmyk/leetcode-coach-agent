import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { StudyPlannerPanel } from "@/components/study-planner-panel";

export default function CoachPlanPage() {
  return (
    <PageShell
      eyebrow="Planner Agent"
      title="Weak topic study planner"
      description="Generate a short LeetCode study plan from local synced problems, review notes, and review history."
      actions={
        <Link
          href="/coach"
          className="inline-flex rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Back to coach
        </Link>
      }
    >
      <StudyPlannerPanel />
    </PageShell>
  );
}

