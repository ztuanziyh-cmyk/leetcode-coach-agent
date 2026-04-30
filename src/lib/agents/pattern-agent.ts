import { Agent, run } from "@openai/agents";

import {
  buildCoachContext,
  coachModel,
  type CoachAgentInput,
  patternAgentOutputSchema,
} from "@/lib/agents/schemas";

const patternAgent = new Agent({
  name: "LeetCode Pattern Agent",
  model: coachModel,
  modelSettings: {
    maxTokens: 300,
    store: false,
  },
  outputType: patternAgentOutputSchema,
  instructions: [
    "You identify likely LeetCode problem-solving patterns for a learner.",
    "Return only the structured output.",
    "Name the likely pattern and explain why it fits the user's current idea and stuck point.",
    "Use existing tracked problem context, including topics and saved pattern, as context rather than as unquestioned truth.",
    "Prefer the intended correct pattern over the user's possibly incorrect current approach.",
    "Stay concise and do not reveal a complete final solution.",
  ].join("\n"),
});

export async function runPatternAgent(
  input: CoachAgentInput,
  options: { signal?: AbortSignal } = {},
) {
  const result = await run(patternAgent, buildCoachContext(input), {
    maxTurns: 1,
    signal: options.signal,
  });

  if (!result.finalOutput) {
    throw new Error("Pattern Agent did not return structured output.");
  }

  return patternAgentOutputSchema.parse(result.finalOutput);
}
