"use client";

import {
  LOCAL_REVIEW_HISTORY_STORAGE_KEY,
  readLocalReviewHistory,
} from "@/lib/local-review-history";
import {
  LOCAL_REVIEW_NOTES_STORAGE_KEY,
  readLocalReviewNotes,
} from "@/lib/local-review-notes";
import {
  LOCAL_SYNC_STORAGE_KEY,
  readLocalSyncResult,
} from "@/lib/local-sync-storage";

export type LocalAppBackup = {
  version: 1;
  exportedAt: string;
  data: LocalAppDataSnapshot;
};

export type LocalAppDataSnapshot = {
  latestSyncResult: ReturnType<typeof readLocalSyncResult>;
  reviewNotes: ReturnType<typeof readLocalReviewNotes>;
  reviewHistory: ReturnType<typeof readLocalReviewHistory>;
};

export function readLocalAppData(): LocalAppDataSnapshot {
  return {
    latestSyncResult: readLocalSyncResult(),
    reviewNotes: readLocalReviewNotes(),
    reviewHistory: readLocalReviewHistory(),
  };
}

export function buildLocalAppBackupFromData(
  data: LocalAppDataSnapshot,
  exportedAt = new Date().toISOString(),
): LocalAppBackup {
  return {
    version: 1,
    exportedAt,
    data,
  };
}

export function buildLocalAppBackup(): LocalAppBackup {
  return buildLocalAppBackupFromData(readLocalAppData());
}

export function getBackupFilename(date = new Date()) {
  const isoDate = date.toISOString().slice(0, 10);
  return `leetcode-review-tracker-backup-${isoDate}.json`;
}

function dispatchAllLocalDataEvents() {
  window.dispatchEvent(new Event("local-sync-change"));
  window.dispatchEvent(new Event("local-review-notes-change"));
  window.dispatchEvent(new Event("local-review-history-change"));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateLocalAppBackup(payload: unknown): payload is LocalAppBackup {
  if (!isPlainObject(payload)) {
    return false;
  }

  if (payload.version !== 1 || typeof payload.exportedAt !== "string") {
    return false;
  }

  if (!isPlainObject(payload.data)) {
    return false;
  }

  const { latestSyncResult, reviewNotes, reviewHistory } = payload.data;

  const syncOk =
    latestSyncResult === null ||
    (isPlainObject(latestSyncResult) &&
      typeof latestSyncResult.syncedAt === "string" &&
      isPlainObject(latestSyncResult.data) &&
      typeof latestSyncResult.data.username === "string");

  return syncOk && isPlainObject(reviewNotes) && isPlainObject(reviewHistory);
}

export function applyLocalAppBackup(backup: LocalAppBackup) {
  if (typeof window === "undefined") {
    return;
  }

  if (backup.data.latestSyncResult) {
    window.localStorage.setItem(
      LOCAL_SYNC_STORAGE_KEY,
      JSON.stringify(backup.data.latestSyncResult),
    );
  } else {
    window.localStorage.removeItem(LOCAL_SYNC_STORAGE_KEY);
  }

  window.localStorage.setItem(
    LOCAL_REVIEW_NOTES_STORAGE_KEY,
    JSON.stringify(backup.data.reviewNotes),
  );
  window.localStorage.setItem(
    LOCAL_REVIEW_HISTORY_STORAGE_KEY,
    JSON.stringify(backup.data.reviewHistory),
  );

  dispatchAllLocalDataEvents();
}

export function clearAllLocalAppData() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LOCAL_SYNC_STORAGE_KEY);
  window.localStorage.removeItem(LOCAL_REVIEW_NOTES_STORAGE_KEY);
  window.localStorage.removeItem(LOCAL_REVIEW_HISTORY_STORAGE_KEY);

  dispatchAllLocalDataEvents();
}
