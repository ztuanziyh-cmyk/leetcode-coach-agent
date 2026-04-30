"use client";

import { useSyncExternalStore } from "react";

import {
  LOCAL_SYNC_STORAGE_KEY,
  readLocalSyncResult,
  type StoredLeetCodeSyncResult,
} from "@/lib/local-sync-storage";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_SYNC_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleLocalChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("local-sync-change", handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("local-sync-change", handleLocalChange);
  };
}

export function useLocalSyncResult() {
  return useSyncExternalStore<StoredLeetCodeSyncResult | null>(
    subscribe,
    readLocalSyncResult,
    () => null,
  );
}
