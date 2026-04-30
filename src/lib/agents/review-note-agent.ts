import { Agent, run } from "@openai/agents";

import {
  buildCoachContext,
  coachModel,
  type CoachAgentInput,
  type HintAgentOutput,
  type PatternAgentOutput,
  reviewNoteAgentOutputSchema,
} from "@/lib/agents/schemas";

const reviewNoteAgent = new Agent({
  name: "LeetCode Review Note Agent",
  model: coachModel,
  modelSettings: {
    maxTokens: 400,
    store: false,
  },
  outputType: reviewNoteAgentOutputSchema,
  instructions: [
    "You create compact review-note drafts for spaced review.",
    "Return only the structured output.",
    "The draft must include pattern, mistakeType, coreIdea, whyMissed, and keyTakeaway.",
    "For reviewNoteDraft.pattern, prefer the intended correct problem-solving pattern for the problem.",
    "Do not put the user's wrong approach as the main pattern unless the problem truly uses that pattern.",
    "Put the user's wrong approach, misconception, brute force attempt, or inefficient data structure choice into mistakeType or whyMissed.",
    "Example: if the user used nested loops for Two Sum, pattern should be Hash Map / Complement Lookup, while mistakeType should mention brute force or time complexity.",
    "Use existing tracked problem context when available, but correct stale or wrong saved notes if the user's current issue shows a better intended pattern.",
    "Use wording the learner can save directly into review notes.",
    "Keep the note focused on learning and avoid giving final code.",
  ].join("\n"),
});

export async function runReviewNoteAgent(
  input: CoachAgentInput,
  pattern: PatternAgentOutput,
  hints: HintAgentOutput,
  options: { signal?: AbortSignal } = {},
) {
  const result = await run(
    reviewNoteAgent,
    [
      buildCoachContext(input),
      `Pattern Agent guess: ${pattern.patternGuess}`,
      `Why this pattern fits: ${pattern.patternFit}`,
      `Brute-force idea: ${hints.bruteForceIdea}`,
      `Optimized direction: ${hints.optimizedDirection}`,
      `Key takeaway: ${hints.keyTakeaway}`,
    ].join("\n\n"),
    { maxTurns: 1, signal: options.signal },
  );

  if (!result.finalOutput) {
    throw new Error("Review Note Agent did not return structured output.");
  }

  return reviewNoteAgentOutputSchema.parse(result.finalOutput);
}
