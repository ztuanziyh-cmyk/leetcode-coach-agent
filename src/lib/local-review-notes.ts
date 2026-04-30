"use client";

import type { LocalReviewNote, ReviewNote, ReviewNoteSummary } from "@/lib/types";

export const LOCAL_REVIEW_NOTES_STORAGE_KEY =
  "leetcode-review-tracker.review-notes";

type LocalReviewNotesMap = Record<string, LocalReviewNote>;
const EMPTY_REVIEW_NOTES: LocalReviewNotesMap = {};

let cachedRawValue: string | null | undefined;
let cachedParsedValue: LocalReviewNotesMap = {};

function normalizeLocalReviewNote(note: LocalReviewNote) {
  return {
    ...note,
    reviewState: note.reviewState ?? "Need Review",
  } satisfies LocalReviewNote;
}

function parseLocalReviewNotes(
  rawValue: string | null,
): LocalReviewNotesMap {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as LocalReviewNotesMap;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([slug, note]) => [slug, normalizeLocalReviewNote(note)]),
    );
  } catch {
    return {};
  }
}

export function readLocalReviewNotes() {
  if (typeof window === "undefined") {
    return EMPTY_REVIEW_NOTES;
  }

  const rawValue = window.localStorage.getItem(LOCAL_REVIEW_NOTES_STORAGE_KEY);

  if (rawValue === cachedRawValue) {
    return cachedParsedValue;
  }

  cachedRawValue = rawValue;
  cachedParsedValue = parseLocalReviewNotes(rawValue);
  return cachedParsedValue;
}

export function saveLocalReviewNote(note: LocalReviewNote) {
  if (typeof window === "undefined") {
    return;
  }

  const currentNotes = readLocalReviewNotes();
  const nextNotes = {
    ...currentNotes,
    [note.problemSlug]: note,
  };
  const rawValue = JSON.stringify(nextNotes);

  cachedRawValue = rawValue;
  cachedParsedValue = nextNotes;

  window.localStorage.setItem(LOCAL_REVIEW_NOTES_STORAGE_KEY, rawValue);
  window.dispatchEvent(new Event("local-review-notes-change"));
}

export function buildInitialLocalReviewNote(
  slug: string,
  reviewNote?: ReviewNote | LocalReviewNote,
): LocalReviewNote {
  if (reviewNote && "problemSlug" in reviewNote && "coreIdea" in reviewNote) {
    return reviewNote;
  }

  const mockReviewNote = reviewNote as ReviewNote | undefined;

  return {
    problemSlug: slug,
    reviewState: "Need Review",
    confidence: mockReviewNote?.confidence ?? null,
    mistakeType: mockReviewNote?.mistakeType ?? "",
    pattern: mockReviewNote?.pattern ?? "",
    coreIdea: "",
    whyMissed: mockReviewNote?.summary ?? "",
    keyTakeaway: mockReviewNote?.keyTakeaway ?? "",
    nextReviewDate: mockReviewNote?.nextReviewAt?.slice(0, 10) ?? "",
    freeformNotes: mockReviewNote?.summary ?? "",
    updatedAt: "",
  };
}

export function getReviewNoteSummary(
  localReviewNote?: LocalReviewNote,
  mockReviewNote?: ReviewNote,
): ReviewNoteSummary {
  if (localReviewNote) {
    return {
      reviewState: localReviewNote.reviewState,
      confidence: localReviewNote.confidence,
      mistakeType: localReviewNote.mistakeType,
      pattern: localReviewNote.pattern,
      coreIdea: localReviewNote.coreIdea,
      whyMissed: localReviewNote.whyMissed,
      keyTakeaway: localReviewNote.keyTakeaway,
      nextReviewDate: localReviewNote.nextReviewDate,
      freeformNotes: localReviewNote.freeformNotes,
      updatedAt: localReviewNote.updatedAt,
    };
  }

  return {
    reviewState: "Need Review",
    confidence: mockReviewNote?.confidence ?? null,
    mistakeType: mockReviewNote?.mistakeType ?? "",
    pattern: mockReviewNote?.pattern ?? "",
    coreIdea: "",
    whyMissed: mockReviewNote?.summary ?? "",
    keyTakeaway: mockReviewNote?.keyTakeaway ?? "",
    nextReviewDate: mockReviewNote?.nextReviewAt?.slice(0, 10) ?? "",
    freeformNotes: mockReviewNote?.summary ?? "",
    updatedAt: mockReviewNote?.updatedAt,
  };
}
