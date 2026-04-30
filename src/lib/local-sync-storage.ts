"use client";

import type { LeetCodeSyncResult } from "@/lib/leetcode";

export const LOCAL_SYNC_STORAGE_KEY = "leetcode-review-tracker.latest-sync";

export type StoredLeetCodeSyncResult = {
  syncedAt: string;
  data: LeetCodeSyncResult;
};

let cachedRawValue: string | null | undefined;
let cachedParsedValue: StoredLeetCodeSyncResult | null = null;

function parseStoredSyncResult(rawValue: string | null): StoredLeetCodeSyncResult | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredLeetCodeSyncResult;

    if (!parsed?.data?.username || !parsed.syncedAt) {
      return null;
    }

    parsed.data.problemMetadataBySlug ??= {};

    return parsed;
  } catch {
    return null;
  }
}

export function readLocalSyncResult(): StoredLeetCodeSyncResult | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(LOCAL_SYNC_STORAGE_KEY);

  if (rawValue === cachedRawValue) {
    return cachedParsedValue;
  }

  cachedRawValue = rawValue;
  cachedParsedValue = parseStoredSyncResult(rawValue);

  return cachedParsedValue;
}

export function saveLocalSyncResult(data: LeetCodeSyncResult) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredLeetCodeSyncResult = {
    syncedAt: new Date().toISOString(),
    data,
  };

  const rawValue = JSON.stringify(payload);
  cachedRawValue = rawValue;
  cachedParsedValue = payload;

  window.localStorage.setItem(LOCAL_SYNC_STORAGE_KEY, rawValue);
  window.dispatchEvent(new Event("local-sync-change"));
}

export function clearLocalSyncResult() {
  if (typeof window === "undefined") {
    return;
  }

  cachedRawValue = null;
  cachedParsedValue = null;

  window.localStorage.removeItem(LOCAL_SYNC_STORAGE_KEY);
  window.dispatchEvent(new Event("local-sync-change"));
}
