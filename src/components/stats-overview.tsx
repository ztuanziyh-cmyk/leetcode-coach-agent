"use client";

import { Card } from "@/components/card";
import { DataSourceBadge } from "@/components/data-source-badge";
import { StatCard } from "@/components/stat-card";
import { TopicMeter } from "@/components/topic-meter";
import { deriveTrackedProblemsFromSync } from "@/lib/local-synced-problems";
import { getReviewNoteSummary } from "@/lib/local-review-notes";
import { getStatisticsData } from "@/lib/review-logic";
import { useLocalReviewHistory } from "@/lib/use-local-review-history";
import { useLocalReviewNotes } from "@/lib/use-local-review-notes";
import { useLocalSyncResult } from "@/lib/use-local-sync-result";

const fallbackStats = getStatisticsData();
const today = "2026-04-29";

export function StatsOverview() {
  const storedSync = useLocalSyncResult();
  const localReviewNotes = useLocalReviewNotes();
  const localReviewHistory = useLocalReviewHistory();
  const syncedProblems = deriveTrackedProblemsFromSync(storedSync?.data);
  const usingLiveData = syncedProblems.length > 0;

  if (!usingLiveData) {
    return (
      <>
        <div className="mb-4">
          <DataSourceBadge live={false} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Solved problems"
            value={
              fallbackStats.solvedByDifficulty.Easy +
              fallbackStats.solvedByDifficulty.Medium +
              fallbackStats.solvedByDifficulty.Hard
            }
            detail="Current fallback dataset size for tracked LeetCode problems."
          />
          <StatCard
            label="Accepted submissions"
            value={fallbackStats.acceptedCount}
            detail="Accepted runs included in the fallback submission dataset."
          />
          <StatCard
            label="Low confidence notes"
            value={fallbackStats.confidenceBuckets.low}
            detail="Problems most likely to appear in the review queue."
          />
          <StatCard
            label="Non-accepted submissions"
            value={fallbackStats.nonAcceptedCount}
            detail="Wrong answer, runtime, or time-limit outcomes in the fallback submission feed."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card title="Weak topics" subtitle="Calculated from the fallback dataset.">
            <div className="space-y-4">
              {fallbackStats.weakTopics.map((topic) => (
                <TopicMeter key={topic.topic} {...topic} />
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card title="Mistake types">
              <div className="space-y-3">
                {fallbackStats.mistakeCounts.slice(0, 6).map(([mistakeType, count]) => (
                  <div key={mistakeType} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{mistakeType}</span>
                    <span className="font-medium text-slate-950">{count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Patterns tagged">
              <div className="space-y-3">
                {fallbackStats.patternCounts.slice(0, 6).map(([pattern, count]) => (
                  <div key={pattern} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{pattern}</span>
                    <span className="font-medium text-slate-950">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const enrichedProblems = syncedProblems.map((problem) => ({
    problem,
    reviewSummary: getReviewNoteSummary(localReviewNotes[problem.slug]),
  }));

  const totalTrackedProblems = enrichedProblems.length;
  const acceptedCount = enrichedProblems.filter(
    (item) => item.problem.status === "accepted",
  ).length;
  const attemptedCount = totalTrackedProblems - acceptedCount;
  const countByDifficulty = {
    Easy: enrichedProblems.filter((item) => item.problem.difficulty === "Easy").length,
    Medium: enrichedProblems.filter((item) => item.problem.difficulty === "Medium").length,
    Hard: enrichedProblems.filter((item) => item.problem.difficulty === "Hard").length,
    Unknown: enrichedProblems.filter((item) => item.problem.difficulty === "Unknown").length,
  };
  const reviewStateCounts = {
    New: enrichedProblems.filter((item) => item.reviewSummary.reviewState === "New").length,
    "Need Review": enrichedProblems.filter(
      (item) => item.reviewSummary.reviewState === "Need Review",
    ).length,
    Reviewing: enrichedProblems.filter(
      (item) => item.reviewSummary.reviewState === "Reviewing",
    ).length,
    Mastered: enrichedProblems.filter(
      (item) => item.reviewSummary.reviewState === "Mastered",
    ).length,
  };
  const confidenceDistribution = {
    1: enrichedProblems.filter((item) => item.reviewSummary.confidence === 1).length,
    2: enrichedProblems.filter((item) => item.reviewSummary.confidence === 2).length,
    3: enrichedProblems.filter((item) => item.reviewSummary.confidence === 3).length,
    4: enrichedProblems.filter((item) => item.reviewSummary.confidence === 4).length,
    5: enrichedProblems.filter((item) => item.reviewSummary.confidence === 5).length,
    Missing: enrichedProblems.filter((item) => item.reviewSummary.confidence === null).length,
  };
  const confidenceSamples = enrichedProblems
    .map((item) => item.reviewSummary.confidence)
    .filter((value): value is 1 | 2 | 3 | 4 | 5 => value !== null);
  const averageConfidence = confidenceSamples.length
    ? (
        confidenceSamples.reduce((sum, value) => sum + value, 0) / confidenceSamples.length
      ).toFixed(1)
    : "N/A";
  const dueReviewCount = enrichedProblems.filter(
    (item) =>
      item.reviewSummary.nextReviewDate && item.reviewSummary.nextReviewDate <= today,
  ).length;

  const topicCountsMap = new Map<string, number>();
  enrichedProblems.forEach((item) => {
    item.problem.topics.forEach((topic) => {
      topicCountsMap.set(topic, (topicCountsMap.get(topic) ?? 0) + 1);
    });
  });
  const topTopics = [...topicCountsMap.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8);

  const weakTopicStats = [...topicCountsMap.keys()]
    .map((topic) => {
      const matching = enrichedProblems.filter((item) => item.problem.topics.includes(topic));
      const lowConfidenceCount = matching.filter(
        (item) => item.reviewSummary.confidence !== null && item.reviewSummary.confidence <= 2,
      ).length;
      const dueCount = matching.filter(
        (item) =>
          item.reviewSummary.nextReviewDate &&
          item.reviewSummary.nextReviewDate <= today,
      ).length;
      const recentMisses = matching.filter(
        (item) => item.problem.latestStatus !== "Accepted",
      ).length;
      const confidenceValues = matching
        .map((item) => item.reviewSummary.confidence)
        .filter((value): value is 1 | 2 | 3 | 4 | 5 => value !== null);
      const average =
        confidenceValues.length > 0
          ? confidenceValues.reduce((sum, value) => sum + value, 0) /
            confidenceValues.length
          : 0;

      return {
        topic,
        averageConfidence: average,
        lowConfidenceCount,
        nonAcceptedCount: recentMisses,
        weaknessScore: lowConfidenceCount * 3 + dueCount * 2 + recentMisses * 2,
      };
    })
    .sort((left, right) => right.weaknessScore - left.weaknessScore)
    .slice(0, 6);

  const mistakeTypeFrequency = Object.entries(
    enrichedProblems.reduce<Record<string, number>>((accumulator, item) => {
      if (item.reviewSummary.mistakeType) {
        accumulator[item.reviewSummary.mistakeType] =
          (accumulator[item.reviewSummary.mistakeType] ?? 0) + 1;
      }
      return accumulator;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);

  const patternFrequency = Object.entries(
    enrichedProblems.reduce<Record<string, number>>((accumulator, item) => {
      if (item.reviewSummary.pattern) {
        accumulator[item.reviewSummary.pattern] =
          (accumulator[item.reviewSummary.pattern] ?? 0) + 1;
      }
      return accumulator;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);

  const recentReviewActivity = Object.values(localReviewHistory)
    .flat()
    .sort((left, right) => right.reviewedAt.localeCompare(left.reviewedAt))
    .slice(0, 8);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <DataSourceBadge live />
        <p className="text-sm text-slate-600">
          Stats are computed from locally synced problems, local review notes, and review history.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tracked problems"
          value={totalTrackedProblems}
          detail="Unique problems derived from the latest local sync."
        />
        <StatCard
          label="Accepted count"
          value={acceptedCount}
          detail="Synced problems with at least one accepted recent submission."
        />
        <StatCard
          label="Attempted count"
          value={attemptedCount}
          detail="Tracked problems without an accepted recent submission."
        />
        <StatCard
          label="Due reviews"
          value={dueReviewCount}
          detail="Problems whose next review date is today or earlier."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Difficulty breakdown">
          <div className="space-y-3">
            {Object.entries(countByDifficulty).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{label}</span>
                <span className="font-medium text-slate-950">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Review state breakdown">
          <div className="space-y-3">
            {Object.entries(reviewStateCounts).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{label}</span>
                <span className="font-medium text-slate-950">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Confidence distribution">
          <div className="space-y-3">
            {Object.entries(confidenceDistribution).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{label}</span>
                <span className="font-medium text-slate-950">{count}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Average confidence: {averageConfidence}
            {confidenceSamples.length ? "" : " (unavailable until notes are added)"}
          </p>
        </Card>

        <Card title="Top topics by tracked problem count">
          <div className="space-y-3">
            {topTopics.length ? (
              topTopics.map(([topic, count]) => (
                <div key={topic} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{topic}</span>
                  <span className="font-medium text-slate-950">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-600">No topic metadata is available yet.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card title="Weak topics" subtitle="Based on low confidence, due reviews, and recent misses.">
          <div className="space-y-4">
            {weakTopicStats.length ? (
              weakTopicStats.map((topic) => (
                <TopicMeter key={topic.topic} {...topic} />
              ))
            ) : (
              <p className="text-sm text-slate-600">
                Weak-topic analysis is unavailable until synced problems include topic metadata.
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Mistake type frequency">
            <div className="space-y-3">
              {mistakeTypeFrequency.length ? (
                mistakeTypeFrequency.map(([mistakeType, count]) => (
                  <div key={mistakeType} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{mistakeType}</span>
                    <span className="font-medium text-slate-950">{count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  Unavailable until review notes include mistake types.
                </p>
              )}
            </div>
          </Card>

          <Card title="Pattern frequency">
            <div className="space-y-3">
              {patternFrequency.length ? (
                patternFrequency.map(([pattern, count]) => (
                  <div key={pattern} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{pattern}</span>
                    <span className="font-medium text-slate-950">{count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">
                  Unavailable until review notes include patterns.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card title="Recent review activity" subtitle="Newest locally logged review results first.">
        <div className="space-y-3">
          {recentReviewActivity.length ? (
            recentReviewActivity.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 p-4 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-950">{entry.problemSlug}</p>
                  <p className="mt-1 text-slate-600">
                    {entry.reviewedAt.slice(0, 16)} • {entry.result}
                  </p>
                </div>
                <p className="text-slate-600">Next review {entry.nextReviewDate}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">
              No review history yet. Log a review result to populate this section.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
