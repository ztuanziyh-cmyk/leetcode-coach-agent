"use client";

import { useState } from "react";

import { saveLocalReviewNote } from "@/lib/local-review-notes";
import type { LocalReviewNote } from "@/lib/types";

const reviewStates = ["New", "Need Review", "Reviewing", "Mastered"] as const;

const mistakeTypes = [
  "Pattern Recognition",
  "Edge Case",
  "Implementation Bug",
  "Time Complexity",
  "Space Complexity",
  "Data Structure Choice",
  "Problem Understanding",
  "Careless Mistake",
  "Forgot Template",
  "Other",
] as const;

const patterns = [
  "Hash Table",
  "Array",
  "String",
  "Linked List",
  "Stack",
  "Queue",
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Prefix Sum",
  "DFS",
  "BFS",
  "Tree",
  "Graph",
  "Heap",
  "Greedy",
  "Dynamic Programming",
  "Backtracking",
  "Union Find",
  "Bit Manipulation",
  "Math",
  "Sorting",
  "Other",
] as const;

const selectClassName =
  "mt-1.5 w-full min-w-0 rounded-2xl border border-slate-300 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";
const inputClassName =
  "mt-1.5 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

type ReviewNotesFormProps = {
  initialNote: LocalReviewNote;
};

export function ReviewNotesForm({ initialNote }: ReviewNotesFormProps) {
  const [form, setForm] = useState(initialNote);
  const [saveState, setSaveState] = useState<"idle" | "unsaved" | "saved">(
    initialNote.updatedAt ? "saved" : "idle",
  );

  function updateField<Key extends keyof LocalReviewNote>(
    key: Key,
    value: LocalReviewNote[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaveState("unsaved");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    saveLocalReviewNote({
      ...form,
      updatedAt: new Date().toISOString(),
    });
    setSaveState("saved");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Review state</span>
          <select
            value={form.reviewState}
            onChange={(event) =>
              updateField("reviewState", event.target.value as LocalReviewNote["reviewState"])
            }
            className={selectClassName}
          >
            {reviewStates.map((reviewState) => (
              <option key={reviewState} value={reviewState}>
                {reviewState}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Confidence</span>
          <select
            value={form.confidence ?? ""}
            onChange={(event) =>
              updateField(
                "confidence",
                event.target.value ? Number(event.target.value) as 1 | 2 | 3 | 4 | 5 : null,
              )
            }
            className={selectClassName}
          >
            <option value="">Select confidence</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Next review date</span>
          <input
            type="date"
            value={form.nextReviewDate}
            onChange={(event) => updateField("nextReviewDate", event.target.value)}
            className={inputClassName}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Mistake type</span>
          <select
            value={form.mistakeType}
            onChange={(event) => updateField("mistakeType", event.target.value as LocalReviewNote["mistakeType"])}
            className={selectClassName}
          >
            <option value="">Select mistake type</option>
            {mistakeTypes.map((mistakeType) => (
              <option key={mistakeType} value={mistakeType}>
                {mistakeType}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Pattern</span>
          <select
            value={form.pattern}
            onChange={(event) => updateField("pattern", event.target.value as LocalReviewNote["pattern"])}
            className={selectClassName}
          >
            <option value="">Select pattern</option>
            {patterns.map((pattern) => (
              <option key={pattern} value={pattern}>
                {pattern}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Core idea</span>
        <textarea
          value={form.coreIdea}
          onChange={(event) => updateField("coreIdea", event.target.value)}
          rows={2}
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Why missed</span>
        <textarea
          value={form.whyMissed}
          onChange={(event) => updateField("whyMissed", event.target.value)}
          rows={2}
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Key takeaway</span>
        <textarea
          value={form.keyTakeaway}
          onChange={(event) => updateField("keyTakeaway", event.target.value)}
          rows={2}
          className={inputClassName}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Freeform notes</span>
        <textarea
          value={form.freeformNotes}
          onChange={(event) => updateField("freeformNotes", event.target.value)}
          rows={3}
          className={inputClassName}
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex rounded-full bg-sky-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800"
        >
          Save notes locally
        </button>
        <p className="text-sm text-slate-600">
          {saveState === "saved"
            ? "Saved locally."
            : saveState === "unsaved"
              ? "Unsaved changes."
              : "Not saved yet."}
        </p>
      </div>
    </form>
  );
}
