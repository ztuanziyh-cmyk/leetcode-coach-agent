import { NextResponse } from "next/server";

import { runCoachManager } from "@/lib/agents/coach-manager";
import { coachModel } from "@/lib/agents/schemas";
import {
  coachInputLimits,
  type CoachProblemContext,
  type CoachRequest,
  helpModes,
} from "@/lib/coach";

const COACH_REQUEST_TIMEOUT_MS = 45_000;

export function GET() {
  return NextResponse.json({ model: coachModel }, { status: 200 });
}

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

  const normalized = normalizeCoachRequest(body);

  if (!normalized.ok) {
    return NextResponse.json(
      { error: normalized.error },
      { status: normalized.status },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COACH_REQUEST_TIMEOUT_MS);

  try {
    const feedback = await runCoachManager(normalized.payload, {
      signal: controller.signal,
    });
    return NextResponse.json({ data: feedback }, { status: 200 });
  } catch (error) {
    const status = isAbortError(error) ? 504 : 500;
    const message = isAbortError(error)
      ? "Coach request timed out. Try shortening the prompt or optional code."
      : "Coach request failed. Check the model configuration and try again.";
    return NextResponse.json({ error: message }, { status });
  } finally {
    clearTimeout(timeoutId);
  }
}

type NormalizeCoachRequestResult =
  | { ok: true; payload: CoachRequest }
  | { ok: false; error: string; status: 400 };

function normalizeCoachRequest(value: unknown): NormalizeCoachRequestResult {
  if (!value || typeof value !== "object") {
    return {
      ok: false,
      error: "Problem, current idea, stuck point, and help mode are required.",
      status: 400,
    };
  }

  const input = value as Record<string, unknown>;
  const problem = toTrimmedString(input.problem);
  const currentIdea = toTrimmedString(input.currentIdea);
  const stuckPoint = toTrimmedString(input.stuckPoint);
  const code = toTrimmedString(input.code);
  const helpMode = toTrimmedString(input.helpMode);
  const problemContext = normalizeProblemContext(input.problemContext);

  if (!problem || !currentIdea || !stuckPoint || !isHelpMode(helpMode)) {
    return {
      ok: false,
      error: "Problem, current idea, stuck point, and help mode are required.",
      status: 400,
    };
  }

  const lengthError = getLengthError({
    problem,
    currentIdea,
    stuckPoint,
    code,
  });

  if (lengthError) {
    return {
      ok: false,
      error: lengthError,
      status: 400,
    };
  }

  return {
    ok: true,
    payload: {
      problem,
      currentIdea,
      stuckPoint,
      code: code || undefined,
      helpMode,
      problemContext: problemContext ?? undefined,
    },
  };
}

function getLengthError(input: {
  problem: string;
  currentIdea: string;
  stuckPoint: string;
  code: string;
}) {
  if (input.problem.length > coachInputLimits.problem) {
    return `Problem title or slug must be ${coachInputLimits.problem} characters or fewer.`;
  }

  if (input.currentIdea.length > coachInputLimits.currentIdea) {
    return `Current idea must be ${coachInputLimits.currentIdea} characters or fewer.`;
  }

  if (input.stuckPoint.length > coachInputLimits.stuckPoint) {
    return `Where I am stuck must be ${coachInputLimits.stuckPoint} characters or fewer.`;
  }

  if (input.code.length > coachInputLimits.code) {
    return `Optional code must be ${coachInputLimits.code} characters or fewer.`;
  }

  return "";
}

function normalizeProblemContext(value: unknown): CoachProblemContext | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const title = toTrimmedString(input.title);
  const slug = toTrimmedString(input.slug);
  const questionFrontendId = toTrimmedString(input.questionFrontendId);
  const difficulty = toTrimmedString(input.difficulty);
  const reviewState = toTrimmedString(input.reviewState);
  const existingPattern = toTrimmedString(input.existingPattern);
  const nextReviewDate = toTrimmedString(input.nextReviewDate);
  const confidence =
    typeof input.confidence === "number" && Number.isFinite(input.confidence)
      ? input.confidence
      : null;
  const topics = Array.isArray(input.topics)
    ? input.topics
        .map((topic) => toTrimmedString(topic))
        .filter(Boolean)
        .slice(0, 12)
    : undefined;

  if (!title && !slug) {
    return null;
  }

  return {
    title: title ? title.slice(0, 160) : undefined,
    slug: slug ? slug.slice(0, 160) : undefined,
    questionFrontendId: questionFrontendId ? questionFrontendId.slice(0, 40) : undefined,
    difficulty: difficulty ? difficulty.slice(0, 20) : undefined,
    topics,
    reviewState: reviewState ? reviewState.slice(0, 40) : undefined,
    confidence,
    existingPattern: existingPattern ? existingPattern.slice(0, 120) : undefined,
    nextReviewDate: nextReviewDate ? nextReviewDate.slice(0, 40) : undefined,
  };
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isHelpMode(value: string): value is CoachRequest["helpMode"] {
  return helpModes.some((mode) => mode === value);
}

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (
    error instanceof Error && error.name === "AbortError"
  );
}
