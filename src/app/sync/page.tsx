import Link from "next/link";

import { PageShell } from "@/components/page-shell";

export default function SyncPage() {
  return (
    <PageShell
      eyebrow="Moved"
      title="LeetCode sync moved to Settings"
      description="The public LeetCode sync workflow now lives with backup, restore, and local data controls."
    >
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm leading-7 text-slate-600">
          Use Settings to enter a LeetCode username, sync public activity, view sync metadata,
          or clear local sync data.
        </p>
        <Link
          href="/settings"
          className="mt-5 inline-flex rounded-full bg-sky-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800"
        >
          Open Settings
        </Link>
      </div>
    </PageShell>
  );
}
