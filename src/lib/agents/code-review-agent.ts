import { Agent, run } from "@openai/agents";

import {
  buildCoachContext,
  coachModel,
  type CoachAgentInput,
  type PatternAgentOutput,
  codeReviewAgentOutputSchema,
} from "@/lib/agents/schemas";

const codeReviewAgent = new Agent({
  name: "LeetCode Code Review Agent",
  model: coachModel,
  modelSettings: {
    maxTokens: 400,
    store: false,
  },
  outputType: codeReviewAgentOutputSchema,
  instructions: [
    "You review optional LeetCode code for a learner.",
    "Return only the structured output.",
    "Focus on likely bugs, complexity gaps, and edge cases.",
    "Use existing tracked problem context to tailor feedback to the known difficulty, topics, and saved review notes.",
    "Do not rewrite the full solution or provide final accepted code.",
  ].join("\n"),
});

export async function runCodeReviewAgent(
  input: CoachAgentInput,
  pattern: PatternAgentOutput,
  options: { signal?: AbortSignal } = {},
) {
  if (!input.code) {
    return null;
  }

  const result = await run(
    codeReviewAgent,
    [
      buildCoachContext(input),
      `Pattern Agent guess: ${pattern.patternGuess}`,
      `Why this pattern fits: ${pattern.patternFit}`,
    ].join("\n\n"),
    { maxTurns: 1, signal: options.signal },
  );

  if (!result.finalOutput) {
    throw new Error("Code Review Agent did not return structured output.");
  }

  return codeReviewAgentOutputSchema.parse(result.finalOutput);
}
