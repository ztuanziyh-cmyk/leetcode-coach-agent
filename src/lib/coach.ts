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
};

export type CoachFeedback = {
  patternGuess: string;
  hints: string[];
  bruteForceIdea: string;
  optimizedDirection: string;
  keyTakeaway: string;
  reviewNoteDraft: {
    pattern: string;
    mistakeType: string;
    coreIdea: string;
    whyMissed: string;
    keyTakeaway: string;
  };
};
