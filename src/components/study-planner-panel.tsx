"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/badge";
import { Card } from "@/components/card";
import { getReviewNoteSummary } from "@/lib/local-review-notes";
import { deriveTrackedProblemsFromSync } from "@/lib/local-synced-problems";
import {
  dailyTargetCounts,
  plannerFocusModes,
  plannerInputLimits,
  planningHorizons,
  type DailyTargetCount,
  type PlannerDataSummary,
  type PlannerFocusMode,
  type PlannerProblemContext,
  type PlanningHorizon,
  type StudyPlanItem,
  type StudyPlanProblem,
  type StudyPlanRequest,
  type StudyPlanResponse,
} from "@/lib/study-plan";
import type { LocalReviewHistoryRecord, LocalReviewNote, SyncedTrackedProblem } from "@/lib/types";
import { useLocalReviewHistory } from "@/lib/use-local-review-history";
import { useLocalReviewNotes } from "@/lib/use-local-review-notes";
import { useLocalSyncResult } from "@/lib/use-local-sync-result";

const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

type RequestState = "idle" | "loading" | "success" | "error";

export function StudyPlannerPanel() {
  const storedSync = useLocalSyncResult();
  const localReviewNotes = useLocalReviewNotes();
  const localReviewHistory = useLocalReviewHistory();
  const [planningHorizon, setPlanningHorizon] = useState<PlanningHorizon>(7);
  const [dailyTargetCount, setDailyTargetCount] = useState<DailyTargetCount>(3);
  const [focusMode, setFocusMode] = useState<PlannerFocusMode>("Mixed");
  const [optionalNote, setOptionalNote] = useState("");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<StudyPlanResponse | null>(null);

  const syncedProblems = useMemo(
    () => deriveTrackedProblemsFromSync(storedSync?.data),
    [storedSync],
  );
  const plannerContext = useMemo(
    () => buildPlannerContext(syncedProblems, localReviewNotes, localReviewHistory),
    [syncedProblems, localReviewNotes, localReviewHistory],
  );
  const hasTrackerData = syncedProblems.length > 0;
  const noteTooLong = optionalNote.length > plannerInputLimits.optionalNote;
  const canGenerate = hasTrackerData && !noteTooLong && requestState !== "loading";

  async function generatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasTrackerData) {
      setError("Sync public LeetCode data before generating a study plan.");
      setRequestState("error");
      return;
    }

    if (noteTooLong) {
      setError(`Optional note must be ${plannerInputLimits.optionalNote} characters or fewer.`);
      setRequestState("error");
      return;
    }

    const payload: StudyPlanRequest = {
      planningHorizon,
      dailyTargetCount,
      focusMode,
      optionalNote: optionalNote.trim() || undefined,
      summary: plannerContext.summary,
      problems: plannerContext.problems,
    };

    setRequestState("loading");
    setError("");
    setPlan(null);

    try {
      const response = await fetch("/api/coach/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) {
        const debugMessage =
          typeof body.debugMessage === "string" ? ` ${body.debugMessage}` : "";
        throw new Error(`${body.error ?? "Study planner request failed."}${debugMessage}`);
      }

      setPlan(body.data);
      setRequestState("success");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Study planner request failed.");
      setRequestState("error");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        <Card title="Planner controls" subtitle="Uses local tracker context only after you generate.">
          <form className="space-y-5" onSubmit={generatePlan}>
            <SegmentedControl
              label="Planning horizon"
              value={planningHorizon}
              options={planningHorizons}
              format={(value) => `${value} days`}
              onChange={setPlanningHorizon}
            />
            <SegmentedControl
              label="Daily target count"
              value={dailyTargetCount}
              options={dailyTargetCounts}
              format={(value) => `${value} problems`}
              onChange={setDailyTargetCount}
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Focus mode</span>
              <select
                value={focusMode}
                onChange={(event) => setFocusMode(event.target.value as PlannerFocusMode)}
                className={inputClass}
              >
                {plannerFocusModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Optional note</span>
              <textarea
                value={optionalNote}
                onChange={(event) => setOptionalNote(event.target.value)}
                rows={4}
                maxLength={plannerInputLimits.optionalNote}
                placeholder="Upcoming interview, specific topic, or personal goal."
                className={inputClass}
              />
              <p
                className={`mt-2 text-right text-xs ${
                  noteTooLong ? "font-medium text-red-600" : "text-slate-500"
                }`}
              >
                {optionalNote.length}/{plannerInputLimits.optionalNote}
              </p>
            </label>
            <button
              type="submit"
              disabled={!canGenerate}
              className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {requestState === "loading" ? "Generating plan..." : "Generate study plan"}
            </button>
          </form>
        </Card>

        <Card title="Tracker summary" subtitle="Compact signals sent to the planner.">
          {hasTrackerData ? (
            <DataSummary summary={plannerContext.summary} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              No synced LeetCode problems found in this browser. Use the Sync page first, then return
              here to generate a plan.
            </div>
          )}
        </Card>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Planner Output
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Study plan</h3>
        </div>

        {requestState === "error" ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        {requestState === "loading" ? (
          <div className="mt-6 space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
            <div className="h-36 w-full animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : null}

        {!plan && requestState !== "loading" ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            Generate a plan to prioritize due reviews, weak topics, low confidence problems, and
            repeated mistakes.
          </div>
        ) : null}

        {plan && requestState !== "loading" ? <PlanResult plan={plan} /> : null}
      </section>
    </div>
  );
}

function SegmentedControl<TValue extends string | number>({
  label,
  value,
  options,
  format,
  onChange,
}: {
  label: string;
  value: TValue;
  options: readonly TValue[];
  format: (value: TValue) => string;
  onChange: (value: TValue) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
              value === option
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {format(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function DataSummary({ summary }: { summary: PlannerDataSummary }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryNumber label="Tracked" value={summary.totalTrackedProblems} />
        <SummaryNumber label="Due" value={summary.dueReviewCount} />
        <SummaryNumber label="Low confidence" value={summary.lowConfidenceCount} />
      </div>
      <SummaryList
        title="Top weak topics"
        emptyText="No weak topic signals yet."
        items={summary.topWeakTopics.map((item) => ({
          label: item.topic,
          value: item.score,
        }))}
      />
      <SummaryList
        title="Common mistake types"
        emptyText="No mistake types saved yet."
        items={summary.commonMistakeTypes.map((item) => ({
          label: item.name,
          value: item.count,
        }))}
      />
      <SummaryList
        title="Common patterns"
        emptyText="No patterns saved yet."
        items={summary.commonPatterns.map((item) => ({
          label: item.name,
          value: item.count,
        }))}
      />
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Review states</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>Need Review · {summary.reviewStateCounts["Need Review"]}</Badge>
          <Badge>Reviewing · {summary.reviewStateCounts.Reviewing}</Badge>
          <Badge>Mastered · {summary.reviewStateCounts.Mastered}</Badge>
        </div>
      </div>
    </div>
  );
}

function SummaryNumber({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SummaryList({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: Array<{ label: string; value: number }>;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {items.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.slice(0, 6).map((item) => (
            <Badge key={item.label}>
              {item.label} · {item.value}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm leading-6 text-slate-600">{emptyText}</p>
      )}
    </div>
  );
}

function PlanResult({ plan }: { plan: StudyPlanResponse }) {
  return (
    <div className="mt-6 space-y-5">
      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
        Model used: {plan.modelUsed}
      </p>
      <OutputBlock title="Weak topic summary" body={plan.weakTopicSummary} />
      <ProblemSection
        title="From your tracker"
        emptyText="No tracked problems were selected by the planner."
        problems={plan.trackedProblemsUsed}
      />
      <ProblemSection
        title="Suggested new practice"
        emptyText="No new practice suggestions were needed."
        problems={plan.suggestedPracticeProblems}
      />
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Priorities</h4>
        <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
          {plan.priorities.map((priority) => (
            <li key={priority} className="rounded-2xl bg-slate-50 px-4 py-3">
              {priority}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Daily plan</h4>
        <div className="mt-2 grid gap-3">
          {plan.dailyPlan.map((day) => (
            <div key={day.day} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-950">{day.day}</span>
                <Badge>{day.focus}</Badge>
              </div>
              <div className="mt-3 grid gap-2">
                {day.items.map((item) => (
                  <PlanItemCard key={`${day.day}-${item.title}-${item.action}`} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <OutputBlock title="Review strategy" body={plan.reviewStrategy} />
      <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-900">Agent trace</summary>
        <ol className="mt-3 grid gap-2">
          {plan.agentTrace.map((item) => (
            <li key={`${item.agentName}-${item.status}`} className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-950">{item.agentName}</span>
                <Badge>{item.status}</Badge>
              </div>
              <p className="mt-1 leading-6 text-slate-600">{item.summary}</p>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function ProblemSection({
  title,
  emptyText,
  problems,
}: {
  title: string;
  emptyText: string;
  problems: StudyPlanProblem[];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {problems.length ? (
        <div className="mt-2 grid gap-2">
          {problems.map((problem) => (
            <div
              key={`${problem.slug ?? problem.title}-${problem.reason}`}
              className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-950">{problem.title}</span>
                {problem.slug ? <Badge>{problem.slug}</Badge> : null}
              </div>
              {problem.topics?.length ? (
                <p className="mt-1 text-xs text-slate-500">{problem.topics.join(" • ")}</p>
              ) : null}
              <p className="mt-1">{problem.reason}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function PlanItemCard({ item }: { item: StudyPlanItem }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-slate-950">{item.title}</span>
        <Badge tone={item.source === "tracked" ? "good" : "warn"}>{item.source}</Badge>
        <Badge>{item.action}</Badge>
        {item.slug ? <Badge>{item.slug}</Badge> : null}
      </div>
      <p className="mt-1">{item.reason}</p>
    </div>
  );
}

function OutputBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
        {body}
      </p>
    </div>
  );
}

function buildPlannerContext(
  syncedProblems: SyncedTrackedProblem[],
  localReviewNotes: Record<string, LocalReviewNote>,
  localReviewHistory: Record<string, LocalReviewHistoryRecord[]>,
) {
  const today = new Date().toISOString().slice(0, 10);
  const enrichedProblems = syncedProblems.map((problem) => {
    const reviewSummary = getReviewNoteSummary(localReviewNotes[problem.slug]);
    const history = localReviewHistory[problem.slug] ?? [];
    const latestHistory = history[0];
    const due = Boolean(
      reviewSummary.nextReviewDate && reviewSummary.nextReviewDate <= today,
    );
    const lowConfidence =
      reviewSummary.confidence !== null && reviewSummary.confidence <= 2;
    const uncertain = problem.latestStatus !== "Accepted";
    const score =
      (due ? 12 : 0) +
      (lowConfidence ? 8 : 0) +
      (uncertain ? 6 : 0) +
      (reviewSummary.mistakeType ? 3 : 0) +
      (reviewSummary.pattern ? 2 : 0);

    return {
      problem,
      reviewSummary,
      history,
      latestHistory,
      due,
      lowConfidence,
      uncertain,
      score,
    };
  });

  const dueReviewCount = enrichedProblems.filter((item) => item.due).length;
  const lowConfidenceCount = enrichedProblems.filter((item) => item.lowConfidence).length;
  const reviewStateCounts = {
    "Need Review": enrichedProblems.filter(
      (item) => item.reviewSummary.reviewState === "Need Review",
    ).length,
    Reviewing: enrichedProblems.filter(
      (item) => item.reviewSummary.reviewState === "Reviewing",
    ).length,
    Mastered: enrichedProblems.filter(
      (item) => item.reviewSummary.reviewState === "Mastered",
    ).length,
  };
  const topWeakTopics = buildWeakTopics(enrichedProblems);
  const commonMistakeTypes = countBy(
    enrichedProblems.map((item) => item.reviewSummary.mistakeType).filter(Boolean),
  );
  const commonPatterns = countBy(
    enrichedProblems.map((item) => item.reviewSummary.pattern).filter(Boolean),
  );
  const problems: PlannerProblemContext[] = enrichedProblems
    .sort((left, right) => {
      return (
        right.score - left.score ||
        right.problem.latestSubmittedAt.localeCompare(left.problem.latestSubmittedAt) ||
        left.problem.title.localeCompare(right.problem.title)
      );
    })
    .slice(0, plannerInputLimits.maxProblems)
    .map((item) => ({
      title: item.problem.title,
      slug: item.problem.slug,
      questionFrontendId: item.problem.questionFrontendId,
      difficulty: item.problem.difficulty,
      topics: item.problem.topics,
      latestStatus: item.problem.latestStatus,
      reviewState: item.reviewSummary.reviewState,
      confidence: item.reviewSummary.confidence,
      mistakeType: item.reviewSummary.mistakeType || undefined,
      pattern: item.reviewSummary.pattern || undefined,
      nextReviewDate: item.reviewSummary.nextReviewDate || undefined,
      lastReviewedAt: item.latestHistory?.reviewedAt,
    }));

  return {
    summary: {
      totalTrackedProblems: syncedProblems.length,
      dueReviewCount,
      lowConfidenceCount,
      reviewStateCounts,
      topWeakTopics,
      commonMistakeTypes,
      commonPatterns,
    },
    problems,
  };
}

function buildWeakTopics(
  enrichedProblems: Array<{
    problem: SyncedTrackedProblem;
    due: boolean;
    lowConfidence: boolean;
    uncertain: boolean;
    reviewSummary: {
      reviewState: string;
      mistakeType: string;
    };
  }>,
) {
  const topicMap = new Map<
    string,
    {
      problemCount: number;
      dueCount: number;
      lowConfidenceCount: number;
      activeReviewCount: number;
      mistakeTypes: Set<string>;
      uncertainCount: number;
    }
  >();

  enrichedProblems.forEach((item) => {
    item.problem.topics.forEach((topic) => {
      const current = topicMap.get(topic) ?? {
        problemCount: 0,
        dueCount: 0,
        lowConfidenceCount: 0,
        activeReviewCount: 0,
        mistakeTypes: new Set<string>(),
        uncertainCount: 0,
      };
      current.problemCount += 1;
      current.dueCount += item.due ? 1 : 0;
      current.lowConfidenceCount += item.lowConfidence ? 1 : 0;
      current.activeReviewCount +=
        item.reviewSummary.reviewState === "Need Review" ||
        item.reviewSummary.reviewState === "Reviewing"
          ? 1
          : 0;
      if (item.reviewSummary.mistakeType) {
        current.mistakeTypes.add(item.reviewSummary.mistakeType);
      }
      current.uncertainCount += item.uncertain ? 1 : 0;
      topicMap.set(topic, current);
    });
  });

  return [...topicMap.entries()]
    .map(([topic, value]) => ({
      topic,
      problemCount: value.problemCount,
      dueCount: value.dueCount,
      lowConfidenceCount: value.lowConfidenceCount,
      activeReviewCount: value.activeReviewCount,
      mistakeTypeCount: value.mistakeTypes.size,
      score:
        value.dueCount * 4 +
        value.lowConfidenceCount * 3 +
        value.activeReviewCount * 2 +
        value.mistakeTypes.size * 2 +
        value.uncertainCount * 2,
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.topic.localeCompare(right.topic))
    .slice(0, 8);
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
}
