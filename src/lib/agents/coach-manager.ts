import type { AgentTraceItem, CoachFeedback, CoachRequest } from "@/lib/coach";
import { runCodeReviewAgent } from "@/lib/agents/code-review-agent";
import { runHintAgent } from "@/lib/agents/hint-agent";
import { runPatternAgent } from "@/lib/agents/pattern-agent";
import { runReviewNoteAgent } from "@/lib/agents/review-note-agent";
import { coachFeedbackSchema, coachModel } from "@/lib/agents/schemas";

type RunCoachManagerOptions = {
  signal?: AbortSignal;
};

export async function runCoachManager(
  input: CoachRequest,
  options: RunCoachManagerOptions = {},
): Promise<CoachFeedback> {
  const agentTrace: AgentTraceItem[] = [
    {
      agentName: "Coach Manager",
      status: "completed",
      summary: input.problemContext
        ? "Received learner request with matched tracker context."
        : "Received learner request without matched tracker context.",
    },
  ];

  const pattern = await runPatternAgent(input, options);
  agentTrace.push({
    agentName: "Pattern Agent",
    status: "completed",
    summary: `Identified ${pattern.patternGuess}.`,
  });

  const hints = await runHintAgent(input, pattern, options);
  agentTrace.push({
    agentName: "Hint Agent",
    status: "completed",
    summary: `Generated ${hints.hints.length} layered hints and solution direction.`,
  });

  const [codeReview, reviewNote] = await Promise.all([
    runCodeReviewAgent(input, pattern, options),
    runReviewNoteAgent(input, pattern, hints, options),
  ]);

  agentTrace.push(
    codeReview
      ? {
          agentName: "Code Review Agent",
          status: "completed",
          summary: "Reviewed optional code for bugs, complexity, and edge cases.",
        }
      : {
          agentName: "Code Review Agent",
          status: "skipped",
          summary: "No optional code was provided.",
        },
    {
      agentName: "Review Note Agent",
      status: "completed",
      summary: `Drafted note using intended pattern: ${reviewNote.reviewNoteDraft.pattern}.`,
    },
  );

  return coachFeedbackSchema.parse({
    modelUsed: coachModel,
    patternGuess: `${pattern.patternGuess}: ${pattern.patternFit}`,
    hints: hints.hints,
    bruteForceIdea: hints.bruteForceIdea,
    optimizedDirection: hints.optimizedDirection,
    keyTakeaway: hints.keyTakeaway,
    ...(codeReview ? { codeFeedback: codeReview.codeFeedback } : {}),
    agentTrace,
    reviewNoteDraft: reviewNote.reviewNoteDraft,
  });
}
