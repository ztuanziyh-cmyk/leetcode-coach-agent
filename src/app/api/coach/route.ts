import { NextResponse } from "next/server";

import { runCoachManager } from "@/lib/agents/coach-manager";
import { type CoachProblemContext, type CoachRequest, helpModes } from "@/lib/coach";

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

  const payload = normalizeCoachRequest(body);

  if (!payload) {
    return NextResponse.json(
      { error: "Problem, current idea, stuck point, and help mode are required." },
      { status: 400 },
    );
  }

  try {
    const feedback = await runCoachManager(payload);
    return NextResponse.json({ data: feedback }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Coach request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeCoachRequest(value: unknown): CoachRequest | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const problem = toTrimmedString(input.problem);
  const currentIdea = toTrimmedString(input.currentIdea);
  const stuckPoint = toTrimmedString(input.stuckPoint);
  const code = toTrimmedString(input.code);
  const helpMode = toTrimmedString(input.helpMode);
  const problemContext = normalizeProblemContext(input.problemContext);

  if (!problem || !currentIdea || !stuckPoint || !isHelpMode(helpMode)) {
    return null;
  }

  return {
    problem: problem.slice(0, 160),
    currentIdea: currentIdea.slice(0, 3000),
    stuckPoint: stuckPoint.slice(0, 2000),
    code: code ? code.slice(0, 8000) : undefined,
    helpMode,
    problemContext: problemContext ?? undefined,
  };
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
