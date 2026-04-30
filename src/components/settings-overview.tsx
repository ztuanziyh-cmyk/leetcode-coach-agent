"use client";

import { useEffect, useRef, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import { Card } from "@/components/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import {
  applyLocalAppBackup,
  buildLocalAppBackup,
  clearAllLocalAppData,
  getBackupFilename,
  validateLocalAppBackup,
} from "@/lib/local-app-data";
import {
  backUpLocalAppDataToCloud,
  getCloudBackupMetadata,
  restoreLatestCloudBackup,
} from "@/lib/supabase/cloud-backup";
import {
  getSupabaseSession,
  sendSupabaseMagicLink,
  signOutSupabase,
  subscribeToSupabaseAuth,
} from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  formatSupabaseErrorForUi,
  logSupabaseError,
} from "@/lib/supabase/errors";
import { useLocalReviewHistory } from "@/lib/use-local-review-history";
import { useLocalReviewNotes } from "@/lib/use-local-review-notes";
import { useLocalSyncResult } from "@/lib/use-local-sync-result";

export function SettingsOverview() {
  const storedSync = useLocalSyncResult();
  const localReviewNotes = useLocalReviewNotes();
  const localReviewHistory = useLocalReviewHistory();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabaseConfigured = isSupabaseConfigured();
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(supabaseConfigured);
  const [authActionLoading, setAuthActionLoading] = useState(false);
  const [cloudActionLoading, setCloudActionLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [lastCloudBackupAt, setLastCloudBackupAt] = useState<string | null>(null);

  const reviewNotesCount = Object.keys(localReviewNotes).length;
  const reviewHistoryCount = Object.values(localReviewHistory).reduce(
    (sum, records) => sum + records.length,
    0,
  );

  useEffect(() => {
    if (!supabaseConfigured) {
      return;
    }

    let mounted = true;

    getSupabaseSession()
      .then((nextSession) => {
        if (!mounted) {
          return;
        }

        setSession(nextSession);
        setAuthLoading(false);
      })
      .catch((error) => {
        logSupabaseError("Unable to read Supabase auth state", error);
        if (!mounted) {
          return;
        }

        setCloudStatus(
          formatSupabaseErrorForUi(error, "Unable to read Supabase auth state."),
        );
        setAuthLoading(false);
      });

    const unsubscribe = subscribeToSupabaseAuth((nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      if (!nextSession) {
        setLastCloudBackupAt(null);
      }
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [supabaseConfigured]);

  useEffect(() => {
    if (!supabaseConfigured || !session?.user?.id || !session?.access_token) {
      return;
    }

    let cancelled = false;

    getCloudBackupMetadata()
      .then((metadata) => {
        if (!cancelled) {
          setLastCloudBackupAt(metadata.updatedAt);
        }
      })
      .catch((error) => {
        logSupabaseError("Failed to load cloud backup metadata", error);
        if (!cancelled) {
          setCloudStatus(
            formatSupabaseErrorForUi(error, "Unable to load cloud backup metadata."),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, session?.user?.id, supabaseConfigured]);

  function handleExportJson() {
    const backup = buildLocalAppBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getBackupFilename();
    link.click();
    URL.revokeObjectURL(url);
    setLocalStatus("Backup exported.");
  }

  async function handleImportJson(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;

      if (!validateLocalAppBackup(payload)) {
        setLocalStatus("Import failed: invalid backup file.");
        return;
      }

      const confirmed = window.confirm(
        "Importing this backup will overwrite existing local app data in this browser. Continue?",
      );

      if (!confirmed) {
        setLocalStatus("Import cancelled.");
        return;
      }

      applyLocalAppBackup(payload);
      setLocalStatus("Backup imported. Reloading app data...");
      window.location.reload();
    } catch {
      setLocalStatus("Import failed: unable to read backup file.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleClearAllLocalData() {
    const confirmed = window.confirm(
      "Clear all local LeetCode Review Tracker data from this browser?",
    );

    if (!confirmed) {
      setLocalStatus("Clear cancelled.");
      return;
    }

    clearAllLocalAppData();
    setLocalStatus("All local app data cleared. Reloading app data...");
    window.location.reload();
  }

  async function handleSendMagicLink() {
    if (!email.trim()) {
      setCloudStatus("Enter an email address to receive a magic link.");
      return;
    }

    setAuthActionLoading(true);
    setCloudStatus(null);

    try {
      await sendSupabaseMagicLink(email.trim());
      setCloudStatus("Magic link sent. Check your email to continue.");
    } catch (error) {
      logSupabaseError("Failed to send Supabase magic link", error);
      setCloudStatus(formatSupabaseErrorForUi(error, "Unable to send magic link."));
    } finally {
      setAuthActionLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthActionLoading(true);
    setCloudStatus(null);

    try {
      await signOutSupabase();
      setCloudStatus("Signed out of Supabase.");
      setLastCloudBackupAt(null);
    } catch (error) {
      logSupabaseError("Failed to sign out of Supabase", error);
      setCloudStatus(formatSupabaseErrorForUi(error, "Unable to sign out."));
    } finally {
      setAuthActionLoading(false);
    }
  }

  async function handleCloudBackup() {
    if (!session?.user || !session?.access_token) {
      setCloudStatus("Please sign in again before using cloud backup.");
      return;
    }

    const confirmed = window.confirm(
      "Back up current local app data to cloud and overwrite the existing cloud backup for this account?",
    );

    if (!confirmed) {
      setCloudStatus("Cloud backup cancelled.");
      return;
    }

    setCloudActionLoading(true);
    setCloudStatus(null);

    try {
      const result = await backUpLocalAppDataToCloud();
      setLastCloudBackupAt(result.updatedAt);
      setCloudStatus("Local data backed up to cloud.");
    } catch (error) {
      logSupabaseError("Cloud backup failed", error);
      setCloudStatus(formatSupabaseErrorForUi(error, "Cloud backup failed."));
    } finally {
      setCloudActionLoading(false);
    }
  }

  async function handleCloudRestore() {
    if (!session?.user || !session?.access_token) {
      setCloudStatus("Please sign in again before using cloud backup.");
      return;
    }

    const confirmed = window.confirm(
      "Restore the latest cloud backup and overwrite existing local app data in this browser?",
    );

    if (!confirmed) {
      setCloudStatus("Cloud restore cancelled.");
      return;
    }

    setCloudActionLoading(true);
    setCloudStatus(null);

    try {
      const backup = await restoreLatestCloudBackup();

      if (!backup) {
        setCloudStatus("No cloud backup exists for this account yet.");
        return;
      }

      if (!validateLocalAppBackup(backup)) {
        setCloudStatus("Cloud restore failed: invalid backup payload.");
        return;
      }

      applyLocalAppBackup(backup);
      setCloudStatus("Cloud backup restored. Reloading app data...");
      window.location.reload();
    } catch (error) {
      logSupabaseError("Cloud restore failed", error);
      setCloudStatus(formatSupabaseErrorForUi(error, "Cloud restore failed."));
    } finally {
      setCloudActionLoading(false);
    }
  }

  const cloudDisabled = !supabaseConfigured;
  const signedIn = Boolean(session?.user);
  const hasActiveSessionToken = Boolean(session?.access_token);

  return (
    <div className="space-y-6">
      <Card
        title="Local data summary"
        subtitle="Only LeetCode Review Tracker localStorage keys are included in backup and restore."
      >
        <div className="space-y-4 text-sm text-slate-700">
          <div className="flex flex-wrap items-center gap-3">
            <DataSourceBadge live={Boolean(storedSync)} />
            <p>Sync data: {storedSync ? "Exists" : "Missing"}</p>
            <p>Review notes: {reviewNotesCount}</p>
            <p>Review history: {reviewHistoryCount}</p>
          </div>
          <p>
            Last synced: {storedSync?.syncedAt?.slice(0, 16).replace("T", " ") ?? "Never"}
          </p>
        </div>
      </Card>

      <Card
        title="Local data backup"
        subtitle="Export or restore sync data, review notes, review history, and other app-specific localStorage data for this project."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportJson}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Export JSON
            </button>

            <label className="inline-flex cursor-pointer rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Import JSON
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportJson}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleClearAllLocalData}
              className="rounded-full border border-rose-300 bg-white px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            >
              Clear all local app data
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p>Backup format includes `version`, `exportedAt`, and a `data` object.</p>
            <p className="mt-2">
              The export does not include browser cookies, unrelated localStorage keys, passwords,
              or tokens.
            </p>
          </div>

          {localStatus ? <p className="text-sm text-slate-600">{localStatus}</p> : null}
        </div>
      </Card>

      <Card
        title="Supabase cloud backup"
        subtitle="Optional cloud backup and restore for the same local data snapshot used by JSON export and import."
      >
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {cloudDisabled ? (
              <>
                <p className="font-medium text-slate-950">Supabase is not configured.</p>
                <p className="mt-2">
                  Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to enable
                  magic-link auth and cloud backup in this environment.
                </p>
              </>
            ) : authLoading ? (
              <p>Checking Supabase auth state...</p>
            ) : signedIn ? (
              <>
                <p className="font-medium text-slate-950">
                  Signed in as {session?.user.email ?? session?.user.id}
                </p>
                <p className="mt-2 break-all text-slate-600">
                  User ID: {session?.user.id}
                </p>
                <p className="mt-2 text-slate-600">
                  Active session token: {hasActiveSessionToken ? "Yes" : "No"}
                </p>
                <p className="mt-2">
                  Last cloud backup:{" "}
                  {lastCloudBackupAt
                    ? lastCloudBackupAt.slice(0, 16).replace("T", " ")
                    : "No cloud backup yet"}
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-slate-950">Not signed in</p>
                <p className="mt-2">
                  Send a magic link to sign in before backing up or restoring cloud data.
                </p>
              </>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter email for magic link"
              disabled={cloudDisabled || authActionLoading || signedIn}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <button
              type="button"
              onClick={handleSendMagicLink}
              disabled={cloudDisabled || authActionLoading || signedIn}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authActionLoading && !signedIn ? "Sending..." : "Send magic link"}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={cloudDisabled || authActionLoading || !signedIn}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authActionLoading && signedIn ? "Signing out..." : "Sign out"}
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCloudBackup}
              disabled={cloudDisabled || !signedIn || cloudActionLoading}
              className="rounded-full bg-sky-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cloudActionLoading ? "Working..." : "Back up local data to cloud"}
            </button>

            <button
              type="button"
              onClick={handleCloudRestore}
              disabled={cloudDisabled || !signedIn || cloudActionLoading}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cloudActionLoading ? "Working..." : "Restore latest cloud backup"}
            </button>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p>
              Cloud backup stores the same snapshot shape used by local JSON export: sync result,
              review notes, and review history.
            </p>
            <p className="mt-2">
              LocalStorage remains the source of truth. Cloud restore writes into local storage and
              keeps the rest of the app behavior unchanged.
            </p>
          </div>

          {cloudStatus ? <p className="text-sm text-slate-600">{cloudStatus}</p> : null}
        </div>
      </Card>
    </div>
  );
}
