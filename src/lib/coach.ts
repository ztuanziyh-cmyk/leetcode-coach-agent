export const helpModes = [
  "Hint only",
  "Explain pattern",
  "Review my approach",
  "Generate review note",
] as const;

export type HelpMode = (typeof helpModes)[number];

export type CoachRequest = {
  problem: string;
  currentIdea: string;
  stuckPoint: string;
  code?: string;
  helpMode: HelpMode;
  problemContext?: CoachProblemContext;
};

export type CoachProblemContext = {
  title?: string;
  slug?: string;
  questionFrontendId?: string;
  difficulty?: string;
  topics?: string[];
  reviewState?: string;
  confidence?: number | null;
  existingPattern?: string;
  nextReviewDate?: string;
};

export type AgentTraceItem = {
  agentName: string;
  status: "completed" | "skipped" | "failed";
  summary: string;
};

export type CoachFeedback = {
  patternGuess: string;
  hints: string[];
  bruteForceIdea: string;
  optimizedDirection: string;
  keyTakeaway: string;
  codeFeedback?: string;
  agentTrace?: AgentTraceItem[];
  reviewNoteDraft: {
    pattern: string;
    mistakeType: string;
    coreIdea: string;
    whyMissed: string;
    keyTakeaway: string;
  };
};
