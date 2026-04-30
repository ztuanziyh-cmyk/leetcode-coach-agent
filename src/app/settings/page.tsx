import { PageShell } from "@/components/page-shell";
import { SettingsOverview } from "@/components/settings-overview";

export default function SettingsPage() {
  return (
    <PageShell
      eyebrow="Settings"
      title="Backup and restore"
      description="Manage local backups, optional Supabase cloud backups, and browser data for this workspace."
    >
      <SettingsOverview />
    </PageShell>
  );
}
