import {
  problems,
  problemsBySlug,
  problemsWithReview,
  reviewNotes,
  seededDailyReviewItems,
  submissions,
  submissionsByProblemSlug,
  userProfile,
} from "@/lib/mock-data";
import type {
  DailyReviewItem,
  Difficulty,
  Problem,
  ProblemWithReview,
  ReviewNote,
} from "@/lib/types";

const TODAY = "2026-04-29";

function startOfDay(dateString?: string) {
  if (!dateString) {
    return undefined;
  }

  return new Date(dateString.slice(0, 10));
}

function getConfidenceLabel(confidence?: number) {
  if (!confidence) {
    return "Unreviewed";
  }
  if (confidence <= 2) {
    return "Fragile";
  }
  if (confidence === 3) {
    return "Shaky";
  }
  return "Solid";
}

function scoreReviewItem(problem: ProblemWithReview, weakTopics: string[]) {
  const reviewNote = problem.reviewNote;
  const latestSubmission = problem.latestSubmission;
  const reasons: string[] = [];
  let priorityScore = 0;

  const today = new Date(TODAY);
  const nextReviewDate = startOfDay(reviewNote?.nextReviewAt);

  if (nextReviewDate && nextReviewDate <= today) {
    priorityScore += 5;
    reasons.push("Overdue review");
  }

  if (reviewNote && reviewNote.confidence <= 2) {
    priorityScore += 4;
    reasons.push(`Confidence ${reviewNote.confidence}`);
  }

  if (latestSubmission && latestSubmission.status !== "Accepted") {
    priorityScore += 3;
    reasons.push(`Latest submission: ${latestSubmission.status}`);
  }

  if (problem.topics.some((topic) => weakTopics.includes(topic))) {
    priorityScore += 2;
    reasons.push("Touches a weak topic");
  }

  if (reviewNote && reviewNote.mistakeType) {
    priorityScore += 1;
    reasons.push(reviewNote.mistakeType);
  }

  return {
    id: `generated-${problem.slug}`,
    date: TODAY,
    problemSlug: problem.slug,
    priorityScore,
    reasons,
    completed: false,
  } satisfies DailyReviewItem;
}

export function getDashboardData() {
  const todayReview = getDailyReviewItems();
  const weakTopics = getWeakTopics().slice(0, 4);
  const recentSubmissions = getRecentSubmissions(6);

  return {
    userProfile,
    totalProblems: problems.length,
    reviewTrackedCount: reviewNotes.length,
    todayReviewCount: todayReview.length,
    overdueCount: todayReview.filter((item) => item.reasons.includes("Overdue review")).length,
    weakTopics,
    recentSubmissions,
  };
}

export function getProblemsList() {
  return [...problemsWithReview].sort((left, right) => {
    const leftDate = left.reviewNote?.nextReviewAt ?? left.lastSolvedAt ?? "";
    const rightDate = right.reviewNote?.nextReviewAt ?? right.lastSolvedAt ?? "";
    return rightDate.localeCompare(leftDate);
  });
}

export function getProblemDetail(slug: string) {
  const problem = problemsBySlug.get(slug);

  if (!problem) {
    return undefined;
  }

  const reviewNote = problemsWithReview.find((item) => item.slug === slug)?.reviewNote;
  const problemSubmissions = submissionsByProblemSlug[slug] ?? [];
  const relatedProblems = problemsWithReview
    .filter((candidate) =>
      candidate.slug !== slug &&
      candidate.topics.some((topic) => problem.topics.includes(topic)),
    )
    .slice(0, 4);

  return {
    problem,
    reviewNote,
    submissions: problemSubmissions,
    relatedProblems,
    confidenceLabel: getConfidenceLabel(reviewNote?.confidence),
  };
}

export function getRecentSubmissions(limit?: number) {
  const list = [...submissions].sort((left, right) =>
    right.submittedAt.localeCompare(left.submittedAt),
  );

  const trimmed = typeof limit === "number" ? list.slice(0, limit) : list;

  return trimmed.map((submission) => ({
    ...submission,
    problem: problemsBySlug.get(submission.problemSlug) as Problem,
  }));
}

export function getDailyReviewItems() {
  const weakTopics = getWeakTopics().map((topic) => topic.topic);

  const generatedItems = problemsWithReview
    .filter((problem) => problem.reviewNote)
    .map((problem) => scoreReviewItem(problem, weakTopics))
    .filter((item) => item.priorityScore > 0)
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, 8)
    .map((item) => {
      const seededMatch = seededDailyReviewItems.find(
        (seededItem) => seededItem.problemSlug === item.problemSlug,
      );
      return seededMatch ?? item;
    });

  return generatedItems.map((item) => ({
    ...item,
    problem: problemsBySlug.get(item.problemSlug) as Problem,
    reviewNote: problemsWithReview.find((problem) => problem.slug === item.problemSlug)
      ?.reviewNote as ReviewNote,
  }));
}

export function getWeakTopics() {
  const topicMap = new Map<
    string,
    {
      topic: string;
      problemCount: number;
      lowConfidenceCount: number;
      nonAcceptedCount: number;
      totalConfidence: number;
      confidenceSamples: number;
    }
  >();

  problemsWithReview.forEach((problem) => {
    problem.topics.forEach((topic) => {
      const current = topicMap.get(topic) ?? {
        topic,
        problemCount: 0,
        lowConfidenceCount: 0,
        nonAcceptedCount: 0,
        totalConfidence: 0,
        confidenceSamples: 0,
      };

      current.problemCount += 1;

      if (problem.reviewNote) {
        current.totalConfidence += problem.reviewNote.confidence;
        current.confidenceSamples += 1;
        if (problem.reviewNote.confidence <= 2) {
          current.lowConfidenceCount += 1;
        }
      }

      if (problem.latestSubmission && problem.latestSubmission.status !== "Accepted") {
        current.nonAcceptedCount += 1;
      }

      topicMap.set(topic, current);
    });
  });

  return [...topicMap.values()]
    .map((topic) => {
      const averageConfidence = topic.confidenceSamples
        ? topic.totalConfidence / topic.confidenceSamples
        : 0;
      const weaknessScore =
        topic.lowConfidenceCount * 3 +
        topic.nonAcceptedCount * 2 +
        Math.max(0, 4 - averageConfidence);

      return {
        ...topic,
        averageConfidence,
        weaknessScore,
      };
    })
    .filter((topic) => topic.problemCount >= 2)
    .sort((left, right) => right.weaknessScore - left.weaknessScore);
}

export function getStatisticsData() {
  const solvedByDifficulty = problems.reduce<Record<Difficulty, number>>(
    (accumulator, problem) => {
      accumulator[problem.difficulty] += 1;
      return accumulator;
    },
    { Easy: 0, Medium: 0, Hard: 0 },
  );

  const confidenceBuckets = {
    low: reviewNotes.filter((note) => note.confidence <= 2).length,
    medium: reviewNotes.filter((note) => note.confidence === 3).length,
    high: reviewNotes.filter((note) => note.confidence >= 4).length,
  };

  const mistakeCounts = reviewNotes.reduce<Record<string, number>>((accumulator, note) => {
    accumulator[note.mistakeType] = (accumulator[note.mistakeType] ?? 0) + 1;
    return accumulator;
  }, {});

  const patternCounts = reviewNotes.reduce<Record<string, number>>((accumulator, note) => {
    accumulator[note.pattern] = (accumulator[note.pattern] ?? 0) + 1;
    return accumulator;
  }, {});

  const acceptedCount = submissions.filter((submission) => submission.status === "Accepted").length;
  const nonAcceptedCount = submissions.length - acceptedCount;

  return {
    solvedByDifficulty,
    confidenceBuckets,
    mistakeCounts: Object.entries(mistakeCounts).sort((left, right) => right[1] - left[1]),
    patternCounts: Object.entries(patternCounts).sort((left, right) => right[1] - left[1]),
    weakTopics: getWeakTopics().slice(0, 6),
    acceptedCount,
    nonAcceptedCount,
  };
}
