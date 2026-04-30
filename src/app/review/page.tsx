import { PageShell } from "@/components/page-shell";
import { ReviewOverview } from "@/components/review-overview";

export default function ReviewPage() {
  return (
    <PageShell
      eyebrow="Daily Queue"
      title="Today&apos;s review list"
      description="See what is due today and log review results as you work through your queue."
    >
      <ReviewOverview />
    </PageShell>
  );
}
