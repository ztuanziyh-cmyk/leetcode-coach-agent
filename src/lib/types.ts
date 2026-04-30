export type Difficulty = "Easy" | "Medium" | "Hard";

export type ProblemStatus = "solved" | "attempted" | "review";

export type SubmissionStatus =
  | "Accepted"
  | "Wrong Answer"
  | "Time Limit Exceeded"
  | "Runtime Error"
  | "Other";

export type Confidence = 1 | 2 | 3 | 4 | 5;

export type ReviewState = "New" | "Need Review" | "Reviewing" | "Mastered";
export type ReviewResult = "Forgot" | "Partial" | "Remembered" | "Mastered";

export type MistakeType =
  | "Edge Case"
  | "Pattern Recognition"
  | "Implementation Bug"
  | "Time Complexity"
  | "Space Complexity"
  | "Data Structure Choice"
  | "Problem Understanding"
  | "Careless Mistake"
  | "Forgot Template"
  | "Other";

export type Pattern =
  | "Hash Table"
  | "Array"
  | "String"
  | "Linked List"
  | "Stack"
  | "Queue"
  | "Two Pointers"
  | "Sliding Window"
  | "Binary Search"
  | "Prefix Sum"
  | "DFS"
  | "BFS"
  | "Tree"
  | "Graph"
  | "Heap"
  | "Greedy"
  | "Dynamic Programming"
  | "Backtracking"
  | "Union Find"
  | "Bit Manipulation"
  | "Math"
  | "Sorting"
  | "Other";

export type UserProfile = {
  username: string;
  displayName?: string;
  ranking?: number;
  totalSolved?: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  streakDays?: number;
  lastSyncedAt?: string;
};

export type Problem = {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  topics: string[];
  status: ProblemStatus;
  source: "leetcode";
  firstSolvedAt?: string;
  lastSolvedAt?: string;
  acceptanceRate?: number;
  url?: string;
};

export type Submission = {
  id: string;
  problemSlug: string;
  submittedAt: string;
  status: SubmissionStatus;
  language?: string;
  runtimeMs?: number;
  memoryMb?: number;
};

export type ReviewNote = {
  id: string;
  problemSlug: string;
  summary: string;
  confidence: Confidence;
  mistakeType: MistakeType;
  pattern: Pattern;
  keyTakeaway: string;
  nextReviewAt?: string;
  lastReviewedAt?: string;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
};

export type LocalReviewNote = {
  problemSlug: string;
  reviewState: ReviewState;
  confidence: Confidence | null;
  mistakeType: MistakeType | "";
  pattern: Pattern | "";
  coreIdea: string;
  whyMissed: string;
  keyTakeaway: string;
  nextReviewDate: string;
  freeformNotes: string;
  updatedAt: string;
};

export type ReviewNoteSummary = {
  reviewState: ReviewState;
  confidence: Confidence | null;
  mistakeType: string;
  pattern: string;
  coreIdea: string;
  whyMissed: string;
  keyTakeaway: string;
  nextReviewDate: string;
  freeformNotes: string;
  updatedAt?: string;
};

export type ReviewSession = {
  id: string;
  problemSlug: string;
  reviewedAt: string;
  confidenceAfterReview: Confidence;
  notes?: string;
};

export type LocalReviewHistoryRecord = {
  id: string;
  problemSlug: string;
  reviewedAt: string;
  result: ReviewResult;
  confidenceBefore: Confidence | null;
  confidenceAfter: Confidence;
  nextReviewDate: string;
  note?: string;
};

export type DailyReviewItem = {
  id: string;
  date: string;
  problemSlug: string;
  priorityScore: number;
  reasons: string[];
  completed: boolean;
  completedAt?: string;
};

export type ProblemWithReview = Problem & {
  reviewNote?: ReviewNote;
  latestSubmission?: Submission;
};

export type SyncedTrackedProblem = {
  id: string;
  title: string;
  slug: string;
  questionFrontendId?: string;
  difficulty: Difficulty | "Unknown";
  topics: string[];
  topicTagSlugs?: string[];
  latestStatus: string;
  latestSubmittedAt: string;
  status: "accepted" | "attempted";
  source: "local-sync";
  url?: string;
};
