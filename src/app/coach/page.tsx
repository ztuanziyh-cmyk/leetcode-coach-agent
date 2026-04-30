import { CoachPanel } from "@/components/coach-panel";
import { PageShell } from "@/components/page-shell";

export default function CoachPage() {
  return (
    <PageShell
      eyebrow="Direct API"
      title="LeetCode coach"
      description="Get structured coaching feedback without changing your tracker or review data."
    >
      <CoachPanel />
    </PageShell>
  );
}
