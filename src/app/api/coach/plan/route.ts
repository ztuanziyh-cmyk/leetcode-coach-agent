import { NextResponse } from "next/server";

import { runStudyPlannerAgent } from "@/lib/agents/study-planner-agent";
import {
  dailyTargetCounts,
  plannerFocusModes,
  plannerInputLimits,
  planningHorizons,
  type PlannerDataSummary,
  type PlannerWeakTopic,
  type PlannerProblemContext,
  type StudyPlanRequest,
} from "@/lib/study-plan";

const PLANNER_REQUEST_TIMEOUT_MS = 45_000;

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const normalized = normalizeStudyPlanRequest(body);

  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PLANNER_REQUEST_TIMEOUT_MS);

  try {
    const data = await runStudyPlannerAgent(normalized.payload, {
      signal: controller.signal,
    });
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    logPlannerRouteError("Study planner route failed", error, {
      planningHorizon: normalized.payload.planningHorizon,
      dailyTargetCount: normalized.payload.dailyTargetCount,
      focusMode: normalized.payload.focusMode,
      problemCount: normalized.payload.problems.length,
      trackedProblemCount: normalized.payload.summary.totalTrackedProblems,
      dueReviewCount: normalized.payload.summary.dueReviewCount,
      lowConfidenceCount: normalized.payload.summary.lowConfidenceCount,
    });

    const status = isAbortError(error) ? 504 : 500;
    const message = isAbortError(error)
      ? "Study planner request timed out. Try a smaller tracker context."
      : "Study planner request failed. Check the model configuration and try again.";
    return NextResponse.json(
      {
        error: message,
        ...(process.env.NODE_ENV === "development"
          ? { debugMessage: getSafeDebugMessage(error) }
          : {}),
      },
      { status },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

type NormalizeStudyPlanRequestResult =
  | { ok: true; payload: StudyPlanRequest }
  | { ok: false; error: string };

function normalizeStudyPlanRequest(value: unknown): NormalizeStudyPlanRequestResult {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Planner request body is required." };
  }

  const input = value as Record<string, unknown>;
  const planningHorizon = Number(input.planningHorizon);
  const dailyTargetCount = Number(input.dailyTargetCount);
  const focusMode = toTrimmedString(input.focusMode);
  const optionalNote = toTrimmedString(input.optionalNote);
  const summary = normalizeSummary(input.summary);
  const problems = normalizeProblems(input.problems);

  if (!planningHorizons.some((value) => value === planningHorizon)) {
    return { ok: false, error: "Planning horizon must be 3 or 7 days." };
  }

  if (!dailyTargetCounts.some((value) => value === dailyTargetCount)) {
    return { ok: false, error: "Daily target count must be 2, 3, or 5." };
  }

  if (!plannerFocusModes.some((value) => value === focusMode)) {
    return { ok: false, error: "Focus mode is invalid." };
  }

  if (optionalNote.length > plannerInputLimits.optionalNote) {
    return {
      ok: false,
      error: `Optional note must be ${plannerInputLimits.optionalNote} characters or fewer.`,
    };
  }

  if (!summary) {
    return { ok: false, error: "Planner data summary is required." };
  }

  if (!problems.length) {
    return {
      ok: false,
      error: "No tracked problems were provided. Sync LeetCode data before generating a plan.",
    };
  }

  return {
    ok: true,
    payload: {
      planningHorizon: planningHorizon as StudyPlanRequest["planningHorizon"],
      dailyTargetCount: dailyTargetCount as StudyPlanRequest["dailyTargetCount"],
      focusMode: focusMode as StudyPlanRequest["focusMode"],
      optionalNote: optionalNote || undefined,
      summary,
      problems,
    },
  };
}

function normalizeSummary(value: unknown): PlannerDataSummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;

  return {
    totalTrackedProblems: toNonNegativeInteger(input.totalTrackedProblems),
    dueReviewCount: toNonNegativeInteger(input.dueReviewCount),
    lowConfidenceCount: toNonNegativeInteger(input.lowConfidenceCount),
    reviewStateCounts: normalizeReviewStateCounts(input.reviewStateCounts),
    topWeakTopics: Array.isArray(input.topWeakTopics)
      ? input.topWeakTopics.slice(0, 8).map(normalizeWeakTopic).filter(isPlannerWeakTopic)
      : [],
    commonMistakeTypes: Array.isArray(input.commonMistakeTypes)
      ? input.commonMistakeTypes.slice(0, 8).map(normalizeCountItem).filter(isCountItem)
      : [],
    commonPatterns: Array.isArray(input.commonPatterns)
      ? input.commonPatterns.slice(0, 8).map(normalizeCountItem).filter(isCountItem)
      : [],
  };
}

function normalizeReviewStateCounts(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      "Need Review": 0,
      Reviewing: 0,
      Mastered: 0,
    };
  }

  const input = value as Record<string, unknown>;

  return {
    "Need Review": toNonNegativeInteger(input["Need Review"]),
    Reviewing: toNonNegativeInteger(input.Reviewing),
    Mastered: toNonNegativeInteger(input.Mastered),
  };
}

function normalizeProblems(value: unknown): PlannerProblemContext[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, plannerInputLimits.maxProblems)
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const input = item as Record<string, unknown>;
      const title = toTrimmedString(input.title).slice(0, 160);
      const slug = toTrimmedString(input.slug).slice(0, 160);

      if (!title || !slug) {
        return null;
      }

      const problem: PlannerProblemContext = {
        title,
        slug,
        topics: Array.isArray(input.topics)
          ? input.topics.map((topic) => toTrimmedString(topic)).filter(Boolean).slice(0, 8)
          : [],
        confidence:
          typeof input.confidence === "number" && Number.isFinite(input.confidence)
            ? input.confidence
            : null,
      };

      const optionalFields = {
        questionFrontendId: toOptionalString(input.questionFrontendId, 40),
        difficulty: toOptionalString(input.difficulty, 20),
        latestStatus: toOptionalString(input.latestStatus, 40),
        reviewState: toOptionalString(input.reviewState, 40),
        mistakeType: toOptionalString(input.mistakeType, 80),
        pattern: toOptionalString(input.pattern, 80),
        nextReviewDate: toOptionalString(input.nextReviewDate, 40),
        lastReviewedAt: toOptionalString(input.lastReviewedAt, 40),
      };

      Object.entries(optionalFields).forEach(([key, fieldValue]) => {
        if (fieldValue) {
          problem[key as keyof typeof optionalFields] = fieldValue;
        }
      });

      return problem;
    })
    .filter(isPlannerProblemContext);
}

function normalizeWeakTopic(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const topic = toTrimmedString(input.topic).slice(0, 80);

  if (!topic) {
    return null;
  }

  return {
    topic,
    score: toNonNegativeInteger(input.score),
    problemCount: toNonNegativeInteger(input.problemCount),
    dueCount: toNonNegativeInteger(input.dueCount),
    lowConfidenceCount: toNonNegativeInteger(input.lowConfidenceCount),
    activeReviewCount: toNonNegativeInteger(input.activeReviewCount),
    mistakeTypeCount: toNonNegativeInteger(input.mistakeTypeCount),
  };
}

function normalizeCountItem(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const name = toTrimmedString(input.name).slice(0, 80);

  if (!name) {
    return null;
  }

  return {
    name,
    count: toNonNegativeInteger(input.count),
  };
}

function isPlannerWeakTopic(value: PlannerWeakTopic | null): value is PlannerWeakTopic {
  return value !== null;
}

function isPlannerProblemContext(
  value: PlannerProblemContext | null,
): value is PlannerProblemContext {
  return value !== null;
}

function isCountItem(value: { name: string; count: number } | null): value is {
  name: string;
  count: number;
} {
  return value !== null;
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalString(value: unknown, maxLength: number) {
  const text = toTrimmedString(value);
  return text ? text.slice(0, maxLength) : undefined;
}

function toNonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (
    error instanceof Error && error.name === "AbortError"
  );
}

function logPlannerRouteError(
  message: string,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  console.error("[api/coach/plan]", {
    message,
    ...getErrorDetails(error),
    ...extra,
  });
}

function getSafeDebugMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unknown planner error.";
  }

  const issues = "issues" in error ? JSON.stringify(error.issues) : "";
  const code = "code" in error ? String(error.code) : "";
  const status = "status" in error ? String(error.status) : "";

  return [error.name, error.message, status && `status=${status}`, code && `code=${code}`, issues]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 2000);
}

function getErrorDetails(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { error };
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause,
    issues: "issues" in error ? error.issues : undefined,
    status: "status" in error ? error.status : undefined,
    code: "code" in error ? error.code : undefined,
    type: "type" in error ? error.type : undefined,
    response: "response" in error ? error.response : undefined,
  };
}
