import { z } from "zod";

import type { CoachFeedback, CoachRequest } from "@/lib/coach";
import type { StudyPlanResponse } from "@/lib/study-plan";

export const coachModel = process.env.OPENAI_COACH_MODEL ?? "gpt-4.1-mini";

export type CoachAgentInput = CoachRequest;

export const patternAgentOutputSchema = z.object({
  patternGuess: z.string(),
  patternFit: z.string(),
});

export const hintAgentOutputSchema = z.object({
  hints: z.array(z.string()).length(3),
  bruteForceIdea: z.string(),
  optimizedDirection: z.string(),
  keyTakeaway: z.string(),
});

export const codeReviewAgentOutputSchema = z.object({
  codeFeedback: z.string(),
});

export const reviewNoteDraftSchema = z.object({
  pattern: z.string(),
  mistakeType: z.string(),
  coreIdea: z.string(),
  whyMissed: z.string(),
  keyTakeaway: z.string(),
});

export const reviewNoteAgentOutputSchema = z.object({
  reviewNoteDraft: reviewNoteDraftSchema,
});

export const coachFeedbackSchema = z.object({
  modelUsed: z.string(),
  patternGuess: z.string(),
  hints: z.array(z.string()),
  bruteForceIdea: z.string(),
  optimizedDirection: z.string(),
  keyTakeaway: z.string(),
  codeFeedback: z.string().optional(),
  agentTrace: z
    .array(
      z.object({
        agentName: z.string(),
        status: z.enum(["completed", "skipped", "failed"]),
        summary: z.string(),
      }),
    )
    .optional(),
  reviewNoteDraft: reviewNoteDraftSchema,
}) satisfies z.ZodType<CoachFeedback>;

export type PatternAgentOutput = z.infer<typeof patternAgentOutputSchema>;
export type HintAgentOutput = z.infer<typeof hintAgentOutputSchema>;
export type CodeReviewAgentOutput = z.infer<typeof codeReviewAgentOutputSchema>;
export type ReviewNoteAgentOutput = z.infer<typeof reviewNoteAgentOutputSchema>;

export const studyPlannerOutputSchema = z.object({
  weakTopicSummary: z.string(),
  priorities: z.array(z.string()).max(5),
  dailyPlan: z
    .array(
      z.object({
        day: z.string(),
        focus: z.string(),
        items: z
          .array(
            z.object({
              title: z.string(),
              slug: z.string().optional(),
              source: z.enum(["tracked", "suggested"]),
              action: z.enum(["review", "practice", "new-practice"]),
              reason: z.string(),
            }),
          )
          .max(3),
      }),
    )
    .max(7),
  trackedProblemsUsed: z
    .array(
      z.object({
        title: z.string(),
        slug: z.string().optional(),
        reason: z.string(),
        topics: z.array(z.string()).optional(),
      }),
    )
    .max(8),
  suggestedPracticeProblems: z
    .array(
      z.object({
        title: z.string(),
        slug: z.string().optional(),
        reason: z.string(),
        topics: z.array(z.string()).optional(),
      }),
    )
    .max(5),
  reviewStrategy: z.string(),
  agentTrace: z.array(
    z.object({
      agentName: z.string(),
      status: z.enum(["completed", "skipped", "failed"]),
      summary: z.string(),
    }),
  ),
  modelUsed: z.string(),
}) satisfies z.ZodType<StudyPlanResponse>;

export type StudyPlannerOutput = z.infer<typeof studyPlannerOutputSchema>;

export function buildCoachContext(input: CoachAgentInput) {
  return [
    `Problem title or slug: ${input.problem}`,
    `Help mode: ${input.helpMode}`,
    input.problemContext
      ? [
          "Existing tracked problem context:",
          input.problemContext.title ? `Title: ${input.problemContext.title}` : undefined,
          input.problemContext.slug ? `Slug: ${input.problemContext.slug}` : undefined,
          input.problemContext.questionFrontendId
            ? `Question ID: ${input.problemContext.questionFrontendId}`
            : undefined,
          input.problemContext.difficulty
            ? `Difficulty: ${input.problemContext.difficulty}`
            : undefined,
          input.problemContext.topics?.length
            ? `Topics: ${input.problemContext.topics.join(", ")}`
            : undefined,
          input.problemContext.reviewState
            ? `Review state: ${input.problemContext.reviewState}`
            : undefined,
          input.problemContext.confidence
            ? `Confidence: ${input.problemContext.confidence}`
            : undefined,
          input.problemContext.existingPattern
            ? `Existing saved pattern: ${input.problemContext.existingPattern}`
            : undefined,
          input.problemContext.nextReviewDate
            ? `Next review date: ${input.problemContext.nextReviewDate}`
            : undefined,
        ]
          .filter(Boolean)
          .join("\n")
      : "Existing tracked problem context: not found",
    `Current idea: ${input.currentIdea}`,
    `Where stuck: ${input.stuckPoint}`,
    input.code ? `Optional code:\n${input.code}` : "Optional code: not provided",
  ].join("\n\n");
}
