"use client";

import { useSyncExternalStore } from "react";

import {
  LOCAL_REVIEW_HISTORY_STORAGE_KEY,
  readLocalReviewHistory,
} from "@/lib/local-review-history";
import type { LocalReviewHistoryRecord } from "@/lib/types";

const EMPTY_REVIEW_HISTORY: Record<string, LocalReviewHistoryRecord[]> = {};

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_REVIEW_HISTORY_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleLocalChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("local-review-history-change", handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("local-review-history-change", handleLocalChange);
  };
}

export function useLocalReviewHistory() {
  return useSyncExternalStore<Record<string, LocalReviewHistoryRecord[]>>(
    subscribe,
    readLocalReviewHistory,
    () => EMPTY_REVIEW_HISTORY,
  );
}
