import { Agent, run } from "@openai/agents";

import {
  buildCoachContext,
  coachModel,
  type CoachAgentInput,
  type PatternAgentOutput,
  hintAgentOutputSchema,
} from "@/lib/agents/schemas";

const hintAgent = new Agent({
  name: "LeetCode Hint Agent",
  model: coachModel,
  modelSettings: {
    maxTokens: 500,
    store: false,
  },
  outputType: hintAgentOutputSchema,
  instructions: [
    "You are a hint-first LeetCode coach.",
    "Return only the structured output.",
    "Generate exactly three layered hints: a gentle nudge, a more specific direction, and a final conceptual hint.",
    "Also provide a brute-force baseline idea, optimized direction, and key takeaway.",
    "Use existing tracked problem context to calibrate difficulty, topic language, review state, and prior notes.",
    "Do not provide final code, a complete final solution, or a full proof unless the user explicitly asks.",
  ].join("\n"),
});

export async function runHintAgent(
  input: CoachAgentInput,
  pattern: PatternAgentOutput,
  options: { signal?: AbortSignal } = {},
) {
  const result = await run(
    hintAgent,
    [
      buildCoachContext(input),
      `Pattern Agent guess: ${pattern.patternGuess}`,
      `Why this pattern fits: ${pattern.patternFit}`,
    ].join("\n\n"),
    { maxTurns: 1, signal: options.signal },
  );

  if (!result.finalOutput) {
    throw new Error("Hint Agent did not return structured output.");
  }

  return hintAgentOutputSchema.parse(result.finalOutput);
}
