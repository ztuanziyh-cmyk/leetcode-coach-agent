"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type AgentTraceItem,
  type CoachFeedback,
  type CoachProblemContext,
  type CoachRequest,
  coachInputLimits,
  helpModes,
  type HelpMode,
} from "@/lib/coach";
import {
  buildInitialLocalReviewNote,
  getReviewNoteSummary,
  readLocalReviewNotes,
  saveLocalReviewNote,
} from "@/lib/local-review-notes";
import { deriveTrackedProblemsFromSync } from "@/lib/local-synced-problems";
import type { LocalReviewNote, ReviewNoteSummary, SyncedTrackedProblem } from "@/lib/types";
import { useLocalReviewNotes } from "@/lib/use-local-review-notes";
import { useLocalSyncResult } from "@/lib/use-local-sync-result";

const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

const emptyFeedback: CoachFeedback | null = null;

type RequestState = "idle" | "loading" | "success" | "error";
type SaveState = "idle" | "saved" | "warning";

export function CoachPanel() {
  const storedSync = useLocalSyncResult();
  const localReviewNotes = useLocalReviewNotes();
  const [problem, setProblem] = useState("");
  const [currentIdea, setCurrentIdea] = useState("");
  const [stuckPoint, setStuckPoint] = useState("");
  const [code, setCode] = useState("");
  const [helpMode, setHelpMode] = useState<HelpMode>("Hint only");
  const [feedback, setFeedback] = useState(emptyFeedback);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [configuredModel, setConfiguredModel] = useState("");

  const hasInputTooLong =
    problem.length > coachInputLimits.problem ||
    currentIdea.length > coachInputLimits.currentIdea ||
    stuckPoint.length > coachInputLimits.stuckPoint ||
    code.length > coachInputLimits.code;
  const canSubmit = problem.trim() && currentIdea.trim() && stuckPoint.trim() && !hasInputTooLong;
  const modelLabel = feedback?.modelUsed || configuredModel || "configured OpenAI model";
  const syncedProblems = useMemo(
    () => deriveTrackedProblemsFromSync(storedSync?.data),
    [storedSync],
  );
  const matchedProblemContext = useMemo(
    () => findMatchedProblemContext(problem, syncedProblems, localReviewNotes),
    [problem, syncedProblems, localReviewNotes],
  );

  const reviewNoteText = useMemo(() => {
    if (!feedback) {
      return "";
    }

    return [
      `Pattern: ${feedback.reviewNoteDraft.pattern}`,
      `Mistake type: ${feedback.reviewNoteDraft.mistakeType}`,
      `Core idea: ${feedback.reviewNoteDraft.coreIdea}`,
      `Why missed: ${feedback.reviewNoteDraft.whyMissed}`,
      `Key takeaway: ${feedback.reviewNoteDraft.keyTakeaway}`,
    ].join("\n");
  }, [feedback]);

  useEffect(() => {
    let ignore = false;

    async function loadCoachConfig() {
      try {
        const response = await fetch("/api/coach");

        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as { model?: string };

        if (!ignore && body.model) {
          setConfiguredModel(body.model);
        }
      } catch {
        // The model name is helpful context, but coaching still works without this request.
      }
    }

    loadCoachConfig();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!problem.trim() || !currentIdea.trim() || !stuckPoint.trim()) {
      setError("Add the problem, your current idea, and where you are stuck.");
      setRequestState("error");
      return;
    }

    if (hasInputTooLong) {
      setError("Shorten the over-limit fields before requesting coaching.");
      setRequestState("error");
      return;
    }

    const payload: CoachRequest = {
      problem: problem.trim(),
      currentIdea: currentIdea.trim(),
      stuckPoint: stuckPoint.trim(),
      code: code.trim() || undefined,
      helpMode,
      problemContext: matchedProblemContext?.context,
    };

    setRequestState("loading");
    setError("");
    setCopyState("idle");
    setSaveState("idle");
    setSaveMessage("");

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Coach request failed.");
      }

      setFeedback(body.data);
      setRequestState("success");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Coach request failed.");
      setRequestState("error");
    }
  }

  async function copyReviewNote() {
    if (!reviewNoteText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(reviewNoteText);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function saveDraftToReviewNotes() {
    if (!feedback) {
      return;
    }

    const problemSlug = normalizeProblemSlug(problem);

    if (!problemSlug) {
      setSaveState("warning");
      setSaveMessage("Add a problem title or slug before saving the draft.");
      return;
    }

    const currentNotes = readLocalReviewNotes();
    const existingNote = currentNotes[problemSlug];
    const baseNote = buildInitialLocalReviewNote(problemSlug, existingNote);

    saveLocalReviewNote({
      ...baseNote,
      pattern: feedback.reviewNoteDraft.pattern as LocalReviewNote["pattern"],
      mistakeType: feedback.reviewNoteDraft.mistakeType as LocalReviewNote["mistakeType"],
      coreIdea: feedback.reviewNoteDraft.coreIdea,
      whyMissed: feedback.reviewNoteDraft.whyMissed,
      keyTakeaway: feedback.reviewNoteDraft.keyTakeaway,
      updatedAt: new Date().toISOString(),
    });

    setSaveState("saved");
    setSaveMessage(`Saved draft to local review notes for ${problemSlug}.`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)]">
      <form className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Coach uses {modelLabel}. Long code or long prompts may increase API cost.
        </div>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Problem title or slug</span>
          <input
            value={problem}
            onChange={(event) => {
              setProblem(event.target.value);
              setSaveState("idle");
              setSaveMessage("");
            }}
            placeholder="two-sum"
            maxLength={coachInputLimits.problem}
            className={inputClass}
          />
          <CharacterCounter value={problem.length} max={coachInputLimits.problem} />
        </label>

        {matchedProblemContext ? (
          <ProblemContextCard
            problem={matchedProblemContext.problem}
            reviewSummary={matchedProblemContext.reviewSummary}
          />
        ) : null}

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Current idea</span>
          <textarea
            value={currentIdea}
            onChange={(event) => setCurrentIdea(event.target.value)}
            rows={4}
            placeholder="Describe the approach you are considering."
            maxLength={coachInputLimits.currentIdea}
            className={inputClass}
          />
          <CharacterCounter value={currentIdea.length} max={coachInputLimits.currentIdea} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Where I am stuck</span>
          <textarea
            value={stuckPoint}
            onChange={(event) => setStuckPoint(event.target.value)}
            rows={3}
            placeholder="Name the exact decision, edge case, or complexity issue."
            maxLength={coachInputLimits.stuckPoint}
            className={inputClass}
          />
          <CharacterCounter value={stuckPoint.length} max={coachInputLimits.stuckPoint} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Optional code</span>
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            rows={7}
            spellCheck={false}
            maxLength={coachInputLimits.code}
            className={`${inputClass} font-mono`}
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <CharacterCounter value={code.length} max={coachInputLimits.code} />
            {code.length > coachInputLimits.codeWarning ? (
              <span className="text-xs font-medium text-amber-700">
                Long code may increase API cost.
              </span>
            ) : null}
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">Help mode</span>
          <select
            value={helpMode}
            onChange={(event) => setHelpMode(event.target.value as HelpMode)}
            className={inputClass}
          >
            {helpModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={requestState === "loading" || !canSubmit}
            className="inline-flex rounded-full bg-sky-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-white"
          >
            {requestState === "loading" ? "Getting feedback..." : "Get coaching"}
          </button>
          <p className="text-sm text-slate-600">
            {requestState === "loading" ? "Thinking through the pattern and next nudge." : "Structured feedback returns as JSON from the server route."}
          </p>
        </div>
      </form>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Coach Output
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Feedback</h3>
          </div>
          {feedback ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={saveDraftToReviewNotes}
                className="rounded-full bg-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800"
              >
                Save draft to review notes
              </button>
              <button
                type="button"
                onClick={copyReviewNote}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {copyState === "copied" ? "Copied" : "Copy note"}
              </button>
            </div>
          ) : null}
        </div>

        {requestState === "error" ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        {saveMessage ? (
          <div
            className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${
              saveState === "saved"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {saveMessage}
          </div>
        ) : null}

        {requestState === "loading" ? (
          <div className="mt-6 space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
            <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : null}

        {!feedback && requestState !== "loading" ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            Fill out the form to get a pattern guess, hints, a brute-force baseline, an optimized direction, and a review note draft.
          </div>
        ) : null}

        {feedback && requestState !== "loading" ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
              Model used: {feedback.modelUsed}
            </p>
            <section className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
              <h4 className="text-sm font-semibold text-slate-950">Pattern guess</h4>
              <p className="mt-2 text-sm leading-6 text-slate-700">{feedback.patternGuess}</p>
            </section>
            <section className="rounded-2xl border border-slate-200 p-4">
              <h4 className="text-sm font-semibold text-slate-900">Hints</h4>
              <ol className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
                {feedback.hints.map((hint, index) => (
                  <li key={hint} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-sky-700">
                      {index + 1}
                    </span>
                    <span>{hint}</span>
                  </li>
                ))}
              </ol>
            </section>
            {feedback.codeFeedback ? (
              <FeedbackBlock title="Code feedback" body={feedback.codeFeedback} />
            ) : null}
            <div className="grid gap-4 xl:grid-cols-2">
              <FeedbackBlock title="Brute-force idea" body={feedback.bruteForceIdea} />
              <FeedbackBlock title="Optimized direction" body={feedback.optimizedDirection} />
            </div>
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <h4 className="text-sm font-semibold text-emerald-950">Key takeaway</h4>
              <p className="mt-2 text-sm leading-6 text-emerald-800">{feedback.keyTakeaway}</p>
            </section>
            <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-sm leading-6 text-white">
              <h4 className="font-semibold text-white">Review note draft</h4>
              <dl className="mt-3 grid gap-2">
                <DraftField label="Pattern" value={feedback.reviewNoteDraft.pattern} />
                <DraftField label="Mistake type" value={feedback.reviewNoteDraft.mistakeType} />
                <DraftField label="Core idea" value={feedback.reviewNoteDraft.coreIdea} />
                <DraftField label="Why missed" value={feedback.reviewNoteDraft.whyMissed} />
                <DraftField label="Key takeaway" value={feedback.reviewNoteDraft.keyTakeaway} />
              </dl>
              {copyState === "failed" ? (
                <p className="mt-3 text-xs text-red-200">Clipboard access failed.</p>
              ) : null}
            </div>
            {feedback.agentTrace?.length ? (
              <AgentTracePanel trace={feedback.agentTrace} />
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ProblemContextCard({
  problem,
  reviewSummary,
}: {
  problem: SyncedTrackedProblem;
  reviewSummary: ReviewNoteSummary;
}) {
  const details = [
    problem.questionFrontendId ? `#${problem.questionFrontendId}` : "",
    problem.difficulty,
    reviewSummary.reviewState,
    reviewSummary.confidence ? `Confidence ${reviewSummary.confidence}` : "",
    reviewSummary.pattern ? `Pattern: ${reviewSummary.pattern}` : "",
    reviewSummary.nextReviewDate ? `Next: ${reviewSummary.nextReviewDate}` : "",
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-950">{problem.title}</span>
        {details.map((detail) => (
          <span key={detail} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600">
            {detail}
          </span>
        ))}
      </div>
      {problem.topics.length ? (
        <p className="mt-2 leading-6 text-slate-600">{problem.topics.join(" • ")}</p>
      ) : null}
    </div>
  );
}

function AgentTracePanel({ trace }: { trace: AgentTraceItem[] }) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-slate-900">Agent trace</summary>
      <ol className="mt-3 grid gap-2">
        {trace.map((item) => (
          <li
            key={`${item.agentName}-${item.status}`}
            className="grid gap-1 rounded-2xl bg-slate-50 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-950">{item.agentName}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs capitalize text-slate-600">
                {item.status}
              </span>
            </div>
            <p className="leading-6 text-slate-600">{item.summary}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

function CharacterCounter({ value, max }: { value: number; max: number }) {
  const overLimit = value > max;

  return (
    <p
      className={`mt-2 text-right text-xs ${
        overLimit ? "font-medium text-red-600" : "text-slate-500"
      }`}
    >
      {value}/{max}
    </p>
  );
}

function FeedbackBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
    </section>
  );
}

function DraftField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </dt>
      <dd className="text-slate-100">{value || "Not provided."}</dd>
    </div>
  );
}

function normalizeProblemSlug(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const lastPathPart = trimmedValue
    .replace(/^https?:\/\/leetcode\.com\/problems\//i, "")
    .split(/[/?#]/)[0]
    .trim();

  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lastPathPart)) {
    return lastPathPart;
  }

  return lastPathPart
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findMatchedProblemContext(
  problemInput: string,
  syncedProblems: SyncedTrackedProblem[],
  localReviewNotes: Record<string, LocalReviewNote>,
) {
  const normalizedInput = normalizeProblemSlug(problemInput);

  if (!normalizedInput) {
    return null;
  }

  const problem = syncedProblems.find(
    (candidate) =>
      candidate.slug === normalizedInput ||
      normalizeProblemSlug(candidate.title) === normalizedInput,
  );

  if (!problem) {
    return null;
  }

  const reviewSummary = getReviewNoteSummary(localReviewNotes[problem.slug]);
  const context: CoachProblemContext = {
    title: problem.title,
    slug: problem.slug,
    questionFrontendId: problem.questionFrontendId,
    difficulty: problem.difficulty,
    topics: problem.topics,
    reviewState: reviewSummary.reviewState,
    confidence: reviewSummary.confidence,
    existingPattern: reviewSummary.pattern || undefined,
    nextReviewDate: reviewSummary.nextReviewDate || undefined,
  };

  return {
    problem,
    reviewSummary,
    context,
  };
}
