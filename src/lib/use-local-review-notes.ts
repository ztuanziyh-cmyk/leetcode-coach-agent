"use client";

import { useSyncExternalStore } from "react";

import {
  LOCAL_REVIEW_NOTES_STORAGE_KEY,
  readLocalReviewNotes,
} from "@/lib/local-review-notes";
import type { LocalReviewNote } from "@/lib/types";

const EMPTY_REVIEW_NOTES: Record<string, LocalReviewNote> = {};

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_REVIEW_NOTES_STORAGE_KEY) {
      onStoreChange();
    }
  };

  const handleLocalChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("local-review-notes-change", handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("local-review-notes-change", handleLocalChange);
  };
}

export function useLocalReviewNotes() {
  return useSyncExternalStore<Record<string, LocalReviewNote>>(
    subscribe,
    readLocalReviewNotes,
    () => EMPTY_REVIEW_NOTES,
  );
}
