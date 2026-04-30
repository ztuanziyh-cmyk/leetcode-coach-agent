import { Agent, run } from "@openai/agents";

import {
  coachModel,
  studyPlannerOutputSchema,
} from "@/lib/agents/schemas";
import type { AgentTraceItem } from "@/lib/coach";
import type {
  StudyPlanItem,
  StudyPlanProblem,
  StudyPlanRequest,
  StudyPlanResponse,
} from "@/lib/study-plan";

const studyPlannerAgent = new Agent({
  name: "Study Planner Agent",
  model: coachModel,
  modelSettings: {
    maxTokens: 1800,
    store: false,
  },
  instructions: [
    "You are a practical LeetCode study planner.",
    "Return compact JSON only. Complete the JSON object.",
    "Return only valid JSON. Do not wrap it in Markdown.",
    "Return strict JSON only: no markdown, no comments, no trailing commas, and all property names must use double quotes.",
    "Return exactly this top-level JSON shape: {\"weakTopicSummary\": string, \"priorities\": string[], \"dailyPlan\": [{\"day\": string, \"focus\": string, \"items\": [{\"title\": string, \"slug\": string optional, \"source\": \"tracked\" | \"suggested\", \"action\": \"review\" | \"practice\" | \"new-practice\", \"reason\": string}]}], \"trackedProblemsUsed\": [{\"title\": string, \"slug\": string optional, \"reason\": string, \"topics\": string[] optional}], \"suggestedPracticeProblems\": [{\"title\": string, \"slug\": string optional, \"reason\": string, \"topics\": string[] optional}], \"reviewStrategy\": string, \"agentTrace\": [{\"agentName\": string, \"status\": \"completed\" | \"skipped\" | \"failed\", \"summary\": string}], \"modelUsed\": string}.",
    "Arrays may be empty when no matching data exists.",
    "Keep the plan concise and actionable. Do not include long explanations.",
    "For both 3-day and 7-day plans, each day must include at most 3 items.",
    "Each item reason must be one short sentence, around 120 characters or less.",
    "trackedProblemsUsed must include at most 8 problems. suggestedPracticeProblems must include at most 5 problems. priorities must include at most 5 strings.",
    "weakTopicSummary must be at most 2 short sentences. reviewStrategy must be at most 3 short bullet-style sentences.",
    "Agent trace summaries must be short.",
    "Do not repeat full problem metadata in multiple places.",
    "Prioritize due reviews, low confidence problems, repeated mistake types, weak topics, and recent failed or uncertain problems.",
    "The provided context includes tracked problem count, due reviews, low confidence, review state counts, weak topics, mistake types, patterns, and up to 20 tracked problems.",
    "Each tracked problem includes slug, title, difficulty, topics, confidence, reviewState, nextReviewDate, mistakeType, and pattern when available.",
    "Do not invent solved or tracked problems that are not in the provided context.",
    "Separate trackedProblemsUsed from suggestedPracticeProblems.",
    "Prioritize tracked problems first in trackedProblemsUsed and dailyPlan.",
    "Only put problems from the provided context in trackedProblemsUsed or daily items with source tracked.",
    "If recommending a problem not in the tracker, put it in suggestedPracticeProblems and daily items with source suggested.",
    "When there are not enough tracked or concrete suggested problems, recommend topic-level practice and clearly label it as suggested new practice.",
    "Daily plan items must be specific objects with title, optional slug, source, action, and reason.",
    "Avoid vague items like 'solve any weaker problem' unless there is not enough tracker data or suggested practice context.",
    "Use the requested horizon, daily target count, focus mode, and optional note.",
    "Prefer problem slugs from the provided context when assigning concrete tracked problems.",
  ].join("\n"),
});

type RunStudyPlannerAgentOptions = {
  signal?: AbortSignal;
};

export async function runStudyPlannerAgent(
  request: StudyPlanRequest,
  options: RunStudyPlannerAgentOptions = {},
): Promise<StudyPlanResponse> {
  const input = [
    `Planning horizon: ${request.planningHorizon} days`,
    `Daily target count: ${request.dailyTargetCount}`,
    `Focus mode: ${request.focusMode}`,
    `Optional note: ${request.optionalNote || "none"}`,
    `Data summary:\n${JSON.stringify(request.summary)}`,
    `Relevant tracked problems, capped by server validation:\n${JSON.stringify(request.problems)}`,
    `Model used: ${coachModel}`,
    [
      "Trace requirement:",
      "Include one agentTrace item for Study Planner Agent with status completed.",
      "The summary should mention the primary signal used, such as due reviews, weak topics, or mixed signals.",
    ].join("\n"),
  ].join("\n\n");

  let result;

  try {
    result = await run(studyPlannerAgent, input, {
      maxTurns: 1,
      signal: options.signal,
    });
  } catch (error) {
    logPlannerAgentError("Study Planner Agent run failed", error);
    throw error;
  }

  if (!result.finalOutput) {
    const error = new Error("Study Planner Agent did not return output.");
    logPlannerAgentError("Study Planner Agent returned empty output", error);
    throw error;
  }

  let output: StudyPlanResponse;

  try {
    output = parseAndNormalizePlannerOutput(result.finalOutput);
  } catch (error) {
    logPlannerAgentError("Using deterministic fallback plan after model output failure", error, {
      outputLength: getOutputLength(result.finalOutput),
      appearsTruncated: appearsTruncated(result.finalOutput),
      rawOutputPreview: previewOutput(result.finalOutput),
    });
    output = buildFallbackPlan(request);
  }

  const hasTrace = output.agentTrace.some(
    (item) => item.agentName === "Study Planner Agent",
  );
  const agentTrace: AgentTraceItem[] = hasTrace
    ? output.agentTrace
    : [
        ...output.agentTrace,
        {
          agentName: "Study Planner Agent",
          status: "completed",
          summary: "Generated a compact study plan from tracker context.",
        },
      ];

  return {
    ...output,
    agentTrace,
    modelUsed: coachModel,
  };
}

function parseAndNormalizePlannerOutput(output: unknown): StudyPlanResponse {
  try {
    const parsed = typeof output === "string" ? parseJsonOutput(output) : output;
    return studyPlannerOutputSchema.parse(normalizePlannerOutput(parsed));
  } catch (error) {
    logPlannerAgentError("Study Planner Agent output parsing failed", error, {
      outputLength: getOutputLength(output),
      appearsTruncated: appearsTruncated(output),
      rawOutputPreview: previewOutput(output),
    });
    throw error;
  }
}

function parseJsonOutput(output: string) {
  const jsonText = sanitizeJsonText(extractJsonObject(stripMarkdownFences(output)));

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
    throw new Error(`Study Planner Agent returned invalid JSON after sanitization: ${message}`, {
      cause: error,
    });
  }
}

function stripMarkdownFences(output: string) {
  const trimmed = output.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fencedMatch?.[1] ?? trimmed).trim();
}

function extractJsonObject(output: string) {
  const startIndex = output.indexOf("{");

  if (startIndex === -1) {
    throw new Error("Study Planner Agent output did not contain a JSON object.");
  }

  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let index = startIndex; index < output.length; index += 1) {
    const char = output[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return output.slice(startIndex, index + 1);
      }
    }
  }

  throw new Error("Study Planner Agent output contained an unterminated JSON object.");
}

function sanitizeJsonText(output: string) {
  return output.replace(/,\s*([}\]])/g, "$1");
}

function normalizePlannerOutput(value: unknown): StudyPlanResponse {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const recommendedProblems = toArray(input.recommendedProblems);
  const trackedProblemsUsed = toArray(input.trackedProblemsUsed);
  const suggestedPracticeProblems = toArray(input.suggestedPracticeProblems);

  return {
    weakTopicSummary: toStringValue(input.weakTopicSummary),
    priorities: toStringArray(input.priorities).map(limitText).slice(0, 5),
    dailyPlan: toArray(input.dailyPlan).slice(0, 7).map(normalizeDailyPlanDay),
    trackedProblemsUsed: (trackedProblemsUsed.length
      ? trackedProblemsUsed
      : recommendedProblems.filter(isTrackedRecommendation)
    ).slice(0, 8).map(normalizePlanProblem),
    suggestedPracticeProblems: (suggestedPracticeProblems.length
      ? suggestedPracticeProblems
      : recommendedProblems.filter((item) => !isTrackedRecommendation(item))
    ).slice(0, 5).map(normalizePlanProblem),
    reviewStrategy: limitText(toStringValue(input.reviewStrategy), 360),
    agentTrace: toArray(input.agentTrace).map(normalizeTraceItem),
    modelUsed: toStringValue(input.modelUsed) || coachModel,
  };
}

function normalizeDailyPlanDay(value: unknown) {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const legacyTasks = toStringArray(input.tasks);
  const legacySlugs = toStringArray(input.problemSlugs);
  const items = toArray(input.items);

  return {
    day: toStringValue(input.day) || "Study day",
    focus: toStringValue(input.focus) || "Mixed review",
    items: (items.length ? items : legacyTasks.map((task, index) => ({
      title: task,
      slug: legacySlugs[index],
      source: legacySlugs[index] ? "tracked" : "suggested",
      action: legacySlugs[index] ? "review" : "practice",
      reason: task,
    }))).slice(0, 3).map(normalizePlanItem),
  };
}

function normalizePlanItem(value: unknown): StudyPlanItem {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const source = input.source === "tracked" ? "tracked" : "suggested";
  const rawAction = toStringValue(input.action);
  const action =
    rawAction === "review" || rawAction === "practice" || rawAction === "new-practice"
      ? rawAction
      : "practice";

  return {
    title: limitText(toStringValue(input.title) || "Topic-level practice", 80),
    slug: toOptionalString(input.slug),
    source,
    action,
    reason: limitText(
      toStringValue(input.reason) || "Selected from the available planner context.",
      120,
    ),
  };
}

function normalizePlanProblem(value: unknown): StudyPlanProblem {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};

  return {
    title: limitText(
      toStringValue(input.title) || toStringValue(input.slug) || "Topic-level practice",
      80,
    ),
    slug: toOptionalString(input.slug),
    reason: limitText(toStringValue(input.reason) || "Selected from planner priorities.", 120),
    topics: toStringArray(input.topics),
  };
}

function normalizeTraceItem(value: unknown): AgentTraceItem {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const status = input.status === "skipped" || input.status === "failed" ? input.status : "completed";

  return {
    agentName: toStringValue(input.agentName) || "Study Planner Agent",
    status,
    summary: limitText(
      toStringValue(input.summary) || "Generated a study plan from tracker context.",
      120,
    ),
  };
}

function buildFallbackPlan(request: StudyPlanRequest): StudyPlanResponse {
  const trackedProblems = request.problems.slice(0, 8).map((problem) => ({
    title: problem.title,
    slug: problem.slug,
    reason: fallbackReason(problem),
    topics: problem.topics.slice(0, 3),
  }));
  const dailyPlan = Array.from({ length: request.planningHorizon }, (_, index) => {
    const start = (index * 3) % Math.max(trackedProblems.length, 1);
    const items = trackedProblems.slice(start, start + 3);
    const wrappedItems = items.length < 3
      ? [...items, ...trackedProblems.slice(0, 3 - items.length)]
      : items;

    return {
      day: `Day ${index + 1}`,
      focus: request.focusMode,
      items: wrappedItems.map((problem) => ({
        title: problem.title,
        slug: problem.slug,
        source: "tracked" as const,
        action: "review" as const,
        reason: problem.reason,
      })),
    };
  });

  return {
    weakTopicSummary: "Used local fallback plan because model output was incomplete.",
    priorities: [
      "Review due problems first.",
      "Prioritize low confidence tracked problems.",
      "Use weak topics to choose extra practice.",
    ],
    dailyPlan,
    trackedProblemsUsed: trackedProblems,
    suggestedPracticeProblems: request.summary.topWeakTopics.slice(0, 5).map((topic) => ({
      title: `${topic.topic} practice`,
      reason: "Suggested because this topic has weak tracker signals.",
      topics: [topic.topic],
    })),
    reviewStrategy:
      "Review due cards first. Rework low-confidence problems without notes. Add one takeaway after each session.",
    agentTrace: [
      {
        agentName: "Study Planner Agent",
        status: "failed",
        summary: "Model output was incomplete; used local fallback plan.",
      },
    ],
    modelUsed: coachModel,
  };
}

function fallbackReason(problem: StudyPlanRequest["problems"][number]) {
  if (problem.nextReviewDate) {
    return "Tracked problem is scheduled for review.";
  }

  if (problem.confidence !== null && problem.confidence !== undefined && problem.confidence <= 2) {
    return "Tracked problem has low confidence.";
  }

  if (problem.reviewState === "Need Review" || problem.reviewState === "Reviewing") {
    return "Tracked problem is still in active review.";
  }

  return "Tracked problem matches current planner priorities.";
}

function isTrackedRecommendation(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const input = value as Record<string, unknown>;
  return input.source === "tracked";
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toStringArray(value: unknown): string[] {
  return toArray(value).map(toStringValue).filter(Boolean);
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toOptionalString(value: unknown) {
  const text = toStringValue(value);
  return text || undefined;
}

function previewOutput(output: unknown) {
  const text = typeof output === "string" ? output : JSON.stringify(output);
  return text.slice(0, 2000);
}

function getOutputLength(output: unknown) {
  return typeof output === "string" ? output.length : JSON.stringify(output).length;
}

function appearsTruncated(output: unknown) {
  if (typeof output !== "string") {
    return false;
  }

  const trimmed = output.trim();
  return trimmed.includes("{") && !trimmed.endsWith("}");
}

function limitText(value: string, maxLength = 160) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value;
}

function logPlannerAgentError(
  message: string,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  console.error("[study-planner-agent]", {
    message,
    ...getErrorDetails(error),
    ...extra,
  });
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
