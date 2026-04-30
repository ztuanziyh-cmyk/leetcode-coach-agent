import { PageShell } from "@/components/page-shell";
import { SyncPreview } from "@/components/sync-preview";

export default function SyncPage() {
  return (
    <PageShell
      eyebrow="Live Preview"
      title="LeetCode public sync"
      description="Sync a public LeetCode profile by username and bring recent activity into your local review workspace."
    >
      <SyncPreview />
    </PageShell>
  );
}
