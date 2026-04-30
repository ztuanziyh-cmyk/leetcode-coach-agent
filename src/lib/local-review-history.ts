"use client";

import {
  buildInitialLocalReviewNote,
  readLocalReviewNotes,
  saveLocalReviewNote,
} from "@/lib/local-review-notes";
import type {
  Confidence,
  LocalReviewHistoryRecord,
  LocalReviewNote,
  ReviewResult,
} from "@/lib/types";

export const LOCAL_REVIEW_HISTORY_STORAGE_KEY =
  "leetcode-review-tracker.review-history";

type LocalReviewHistoryMap = Record<string, LocalReviewHistoryRecord[]>;
const EMPTY_REVIEW_HISTORY: LocalReviewHistoryMap = {};

let cachedRawValue: string | null | undefined;
let cachedParsedValue: LocalReviewHistoryMap = EMPTY_REVIEW_HISTORY;

function parseLocalReviewHistory(rawValue: string | null) {
  if (!rawValue) {
    return EMPTY_REVIEW_HISTORY;
  }

  try {
    const parsed = JSON.parse(rawValue) as LocalReviewHistoryMap;

    if (!parsed || typeof parsed !== "object") {
      return EMPTY_REVIEW_HISTORY;
    }

    return parsed;
  } catch {
    return EMPTY_REVIEW_HISTORY;
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function clampConfidence(value: number): Confidence {
  return Math.min(5, Math.max(1, value)) as Confidence;
}

function scheduleReviewResult(
  note: LocalReviewNote,
  result: ReviewResult,
  now: Date,
) {
  const currentConfidence = note.confidence ?? 3;

  if (result === "Forgot") {
    return {
      reviewState: "Need Review" as const,
      confidenceAfter: clampConfidence(currentConfidence - 1),
      nextReviewDate: addDays(now, 1),
    };
  }

  if (result === "Partial") {
    const confidenceAfter =
      note.confidence && note.confidence < 3
        ? clampConfidence(currentConfidence + 1)
        : currentConfidence;

    return {
      reviewState: "Reviewing" as const,
      confidenceAfter,
      nextReviewDate: addDays(now, 3),
    };
  }

  if (result === "Remembered") {
    return {
      reviewState: "Reviewing" as const,
      confidenceAfter: clampConfidence(currentConfidence + 1),
      nextReviewDate: addDays(now, 7),
    };
  }

  return {
    reviewState: "Mastered" as const,
    confidenceAfter: 5 as Confidence,
    nextReviewDate: addDays(now, 30),
  };
}

export function readLocalReviewHistory() {
  if (typeof window === "undefined") {
    return EMPTY_REVIEW_HISTORY;
  }

  const rawValue = window.localStorage.getItem(LOCAL_REVIEW_HISTORY_STORAGE_KEY);

  if (rawValue === cachedRawValue) {
    return cachedParsedValue;
  }

  cachedRawValue = rawValue;
  cachedParsedValue = parseLocalReviewHistory(rawValue);
  return cachedParsedValue;
}

export function appendLocalReviewHistoryRecord(record: LocalReviewHistoryRecord) {
  if (typeof window === "undefined") {
    return;
  }

  const currentHistory = readLocalReviewHistory();
  const existingRecords = currentHistory[record.problemSlug] ?? [];
  const nextHistory = {
    ...currentHistory,
    [record.problemSlug]: [record, ...existingRecords],
  };
  const rawValue = JSON.stringify(nextHistory);

  cachedRawValue = rawValue;
  cachedParsedValue = nextHistory;

  window.localStorage.setItem(LOCAL_REVIEW_HISTORY_STORAGE_KEY, rawValue);
  window.dispatchEvent(new Event("local-review-history-change"));
}

export function logReviewResultForProblem(
  problemSlug: string,
  result: ReviewResult,
  noteText?: string,
) {
  const now = new Date();
  const currentNote = readLocalReviewNotes()[problemSlug];
  const baseNote = buildInitialLocalReviewNote(problemSlug, currentNote);
  const scheduled = scheduleReviewResult(baseNote, result, now);

  const nextNote: LocalReviewNote = {
    ...baseNote,
    reviewState: scheduled.reviewState,
    confidence: scheduled.confidenceAfter,
    nextReviewDate: scheduled.nextReviewDate,
    updatedAt: now.toISOString(),
  };

  saveLocalReviewNote(nextNote);

  const historyRecord: LocalReviewHistoryRecord = {
    id: `${problemSlug}-${now.getTime()}`,
    problemSlug,
    reviewedAt: now.toISOString(),
    result,
    confidenceBefore: baseNote.confidence,
    confidenceAfter: scheduled.confidenceAfter,
    nextReviewDate: scheduled.nextReviewDate,
    note: noteText || undefined,
  };

  appendLocalReviewHistoryRecord(historyRecord);

  return {
    nextNote,
    historyRecord,
  };
}
