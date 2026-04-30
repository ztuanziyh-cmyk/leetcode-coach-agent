import Link from "next/link";

import { CoachPanel } from "@/components/coach-panel";
import { PageShell } from "@/components/page-shell";

export default function CoachPage() {
  return (
    <PageShell
      eyebrow="Direct API"
      title="LeetCode coach"
      description="Get structured coaching feedback without changing your tracker or review data."
      actions={
        <Link
          href="/coach/plan"
          className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Open study planner
        </Link>
      }
    >
      <CoachPanel />
    </PageShell>
  );
}
