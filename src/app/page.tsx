import { DashboardOverview } from "@/components/dashboard-overview";
import { PageShell } from "@/components/page-shell";

export default function Home() {
  return (
    <PageShell
      eyebrow="Dashboard"
      title="Review workflow snapshot"
      description="A focused home view for today’s queue, recent activity, and the weak spots that should drive the next review session."
    >
      <DashboardOverview />
    </PageShell>
  );
}
