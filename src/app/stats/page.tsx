import { PageShell } from "@/components/page-shell";
import { StatsOverview } from "@/components/stats-overview";

export default function StatsPage() {
  return (
    <PageShell
      eyebrow="Signals"
      title="Statistics and weak topics"
      description="A readable snapshot of tracked problems, notes, review state, weak topics, and recent review activity."
    >
      <StatsOverview />
    </PageShell>
  );
}
