import OpenAI from "openai";
import { NextResponse } from "next/server";

import { type CoachFeedback, type CoachRequest, helpModes } from "@/lib/coach";

const coachResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    patternGuess: { type: "string" },
    hints: {
      type: "array",
      items: { type: "string" },
    },
    bruteForceIdea: { type: "string" },
    optimizedDirection: { type: "string" },
    keyTakeaway: { type: "string" },
    reviewNoteDraft: {
      type: "object",
      additionalProperties: false,
      properties: {
        pattern: { type: "string" },
        mistakeType: { type: "string" },
        coreIdea: { type: "string" },
        whyMissed: { type: "string" },
        keyTakeaway: { type: "string" },
      },
      required: ["pattern", "mistakeType", "coreIdea", "whyMissed", "keyTakeaway"],
    },
  },
  required: [
    "patternGuess",
    "hints",
    "bruteForceIdea",
    "optimizedDirection",
    "keyTakeaway",
    "reviewNoteDraft",
  ],
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const response = await client.responses.create({
      model: process.env.OPENAI_COACH_MODEL ?? "gpt-4.1-mini",
      instructions: [
        "You are a LeetCode coach for deliberate practice and spaced review.",
        "Return JSON only, matching the supplied schema.",
        "Do not give the complete final solution, final code, or full proof unless the user explicitly asks for it.",
        "Prefer Socratic hints, pattern recognition cues, complexity framing, and review-note wording.",
        "Keep hints short and actionable. If code is provided, review the approach without rewriting the whole solution.",
      ].join("\n"),
      input: [
        `Problem title or slug: ${payload.problem}`,
        `Help mode: ${payload.helpMode}`,
        `Current idea: ${payload.currentIdea}`,
        `Where stuck: ${payload.stuckPoint}`,
        payload.code ? `Optional code:\n${payload.code}` : "Optional code: not provided",
      ].join("\n\n"),
      max_output_tokens: 900,
      store: false,
      text: {
        format: {
          type: "json_schema",
          name: "leetcode_coach_feedback",
          strict: true,
          schema: coachResponseSchema,
        },
      },
    });

    const feedback = JSON.parse(response.output_text) as CoachFeedback;
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

  if (!problem || !currentIdea || !stuckPoint || !isHelpMode(helpMode)) {
    return null;
  }

  return {
    problem: problem.slice(0, 160),
    currentIdea: currentIdea.slice(0, 3000),
    stuckPoint: stuckPoint.slice(0, 2000),
    code: code ? code.slice(0, 8000) : undefined,
    helpMode,
  };
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isHelpMode(value: string): value is CoachRequest["helpMode"] {
  return helpModes.some((mode) => mode === value);
}
