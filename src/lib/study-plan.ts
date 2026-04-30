import type { AgentTraceItem } from "@/lib/coach";

export const planningHorizons = [3, 7] as const;
export const dailyTargetCounts = [2, 3, 5] as const;
export const plannerFocusModes = [
  "Review due problems",
  "Weak topics",
  "Mixed",
] as const;

export const plannerInputLimits = {
  optionalNote: 500,
  maxProblems: 20,
} as const;

export type PlanningHorizon = (typeof planningHorizons)[number];
export type DailyTargetCount = (typeof dailyTargetCounts)[number];
export type PlannerFocusMode = (typeof plannerFocusModes)[number];

export type PlannerWeakTopic = {
  topic: string;
  score: number;
  problemCount: number;
  dueCount: number;
  lowConfidenceCount: number;
  activeReviewCount: number;
  mistakeTypeCount: number;
};

export type PlannerProblemContext = {
  title: string;
  slug: string;
  questionFrontendId?: string;
  difficulty?: string;
  topics: string[];
  latestStatus?: string;
  reviewState?: string;
  confidence?: number | null;
  mistakeType?: string;
  pattern?: string;
  nextReviewDate?: string;
  lastReviewedAt?: string;
};

export type PlannerDataSummary = {
  totalTrackedProblems: number;
  dueReviewCount: number;
  lowConfidenceCount: number;
  reviewStateCounts: {
    "Need Review": number;
    Reviewing: number;
    Mastered: number;
  };
  topWeakTopics: PlannerWeakTopic[];
  commonMistakeTypes: Array<{ name: string; count: number }>;
  commonPatterns: Array<{ name: string; count: number }>;
};

export type StudyPlanRequest = {
  planningHorizon: PlanningHorizon;
  dailyTargetCount: DailyTargetCount;
  focusMode: PlannerFocusMode;
  optionalNote?: string;
  summary: PlannerDataSummary;
  problems: PlannerProblemContext[];
};

export type StudyPlanResponse = {
  weakTopicSummary: string;
  priorities: string[];
  dailyPlan: Array<{
    day: string;
    focus: string;
    items: StudyPlanItem[];
  }>;
  trackedProblemsUsed: StudyPlanProblem[];
  suggestedPracticeProblems: StudyPlanProblem[];
  reviewStrategy: string;
  agentTrace: AgentTraceItem[];
  modelUsed: string;
};

export type StudyPlanItem = {
  title: string;
  slug?: string;
  source: "tracked" | "suggested";
  action: "review" | "practice" | "new-practice";
  reason: string;
};

export type StudyPlanProblem = {
  title: string;
  slug?: string;
  reason: string;
  topics?: string[];
};
