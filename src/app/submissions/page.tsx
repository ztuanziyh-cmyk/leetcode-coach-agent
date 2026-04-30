import { PageShell } from "@/components/page-shell";
import { SubmissionsOverview } from "@/components/submissions-overview";

export default function SubmissionsPage() {
  return (
    <PageShell
      eyebrow="Activity Feed"
      title="Recent submissions"
      description="A reverse chronological view of recent LeetCode attempts and accepted runs."
    >
      <SubmissionsOverview />
    </PageShell>
  );
}
