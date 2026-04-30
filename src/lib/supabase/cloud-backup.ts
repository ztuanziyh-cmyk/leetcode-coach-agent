"use client";

import {
  buildLocalAppBackup,
  buildLocalAppBackupFromData,
  type LocalAppBackup,
} from "@/lib/local-app-data";
import type { StoredLeetCodeSyncResult } from "@/lib/local-sync-storage";
import type { LocalReviewHistoryRecord, LocalReviewNote } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type UserDatasetRow = {
  user_id: string;
  version: number;
  latest_sync_result: unknown;
  review_notes: unknown;
  review_history: unknown;
  settings_snapshot: unknown;
  updated_at?: string;
};

type UserDatasetMetadata = {
  updatedAt: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStoredSyncResult(value: unknown): value is StoredLeetCodeSyncResult {
  return (
    isPlainObject(value) &&
    typeof value.syncedAt === "string" &&
    isPlainObject(value.data) &&
    typeof value.data.username === "string"
  );
}

function normalizeReviewNotes(value: unknown): Record<string, LocalReviewNote> {
  return isPlainObject(value) ? (value as Record<string, LocalReviewNote>) : {};
}

function normalizeReviewHistory(
  value: unknown,
): Record<string, LocalReviewHistoryRecord[]> {
  return isPlainObject(value)
    ? (value as Record<string, LocalReviewHistoryRecord[]>)
    : {};
}

function normalizeSyncResult(value: unknown): StoredLeetCodeSyncResult | null {
  return isStoredSyncResult(value) ? value : null;
}

function mapBackupToDatasetRow(
  userId: string,
  backup: LocalAppBackup,
): UserDatasetRow {
  return {
    user_id: userId,
    version: backup.version,
    latest_sync_result: backup.data.latestSyncResult ?? {},
    review_notes: backup.data.reviewNotes,
    review_history: backup.data.reviewHistory,
    settings_snapshot: {},
  };
}

function mapDatasetRowToBackup(row: UserDatasetRow): LocalAppBackup {
  return buildLocalAppBackupFromData(
    {
      latestSyncResult: normalizeSyncResult(row.latest_sync_result),
      reviewNotes: normalizeReviewNotes(row.review_notes),
      reviewHistory: normalizeReviewHistory(row.review_history),
    },
    row.updated_at ?? new Date().toISOString(),
  );
}

async function getAuthenticatedSupabaseUserId() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const session = data.session;
  const userId = session?.user?.id;
  const accessToken = session?.access_token;

  if (!userId || !accessToken) {
    throw new Error("Please sign in again before using cloud backup.");
  }

  return { supabase, userId };
}

export async function backUpLocalAppDataToCloud() {
  const { supabase, userId } = await getAuthenticatedSupabaseUserId();

  const backup = buildLocalAppBackup();
  const row = mapBackupToDatasetRow(userId, backup);

  const { data, error } = await supabase
    .from("user_datasets")
    .upsert(row, {
      onConflict: "user_id",
    })
    .select("updated_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    backup,
    updatedAt: (data?.updated_at as string | undefined) ?? backup.exportedAt,
  };
}

export async function getCloudBackupMetadata(): Promise<UserDatasetMetadata> {
  const { supabase, userId } = await getAuthenticatedSupabaseUserId();

  const { data, error } = await supabase
    .from("user_datasets")
    .select("updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    updatedAt: (data?.updated_at as string | undefined) ?? null,
  };
}

export async function restoreLatestCloudBackup() {
  const { supabase, userId } = await getAuthenticatedSupabaseUserId();

  const { data, error } = await supabase
    .from("user_datasets")
    .select(
      "user_id, version, latest_sync_result, review_notes, review_history, settings_snapshot, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapDatasetRowToBackup(data as UserDatasetRow);
}
