import { PageShell } from "@/components/page-shell";
import { ProblemsOverview } from "@/components/problems-overview";

export default function ProblemsPage() {
  return (
    <PageShell
      eyebrow="Problem Bank"
      title="Tracked problems"
      description="Browse tracked problems, recent synced activity, and locally saved review notes in one list."
    >
      <ProblemsOverview />
    </PageShell>
  );
}
