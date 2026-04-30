export const helpModes = [
  "Hint only",
  "Explain pattern",
  "Review my approach",
  "Generate review note",
] as const;

export type HelpMode = (typeof helpModes)[number];

export const coachInputLimits = {
  problem: 120,
  currentIdea: 2000,
  stuckPoint: 2000,
  code: 12000,
  codeWarning: 8000,
} as const;

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
  modelUsed: string;
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
