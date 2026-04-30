import type {
  LeetCodeSyncResult,
  LeetCodeSyncSubmission,
} from "@/lib/leetcode";
import type { SyncedTrackedProblem } from "@/lib/types";

type SyncedProblemDetail = {
  problem: SyncedTrackedProblem;
  submissions: LeetCodeSyncSubmission[];
};

function sortByNewest(
  left: LeetCodeSyncSubmission,
  right: LeetCodeSyncSubmission,
) {
  return Number(right.timestamp) - Number(left.timestamp);
}

function toIsoTimestamp(timestamp: string) {
  return new Date(Number(timestamp) * 1000).toISOString();
}

export function deriveTrackedProblemsFromSync(
  syncResult?: LeetCodeSyncResult | null,
) {
  if (!syncResult) {
    return [] satisfies SyncedTrackedProblem[];
  }

  const grouped = new Map<string, LeetCodeSyncSubmission[]>();

  syncResult.recentSubmissions.forEach((submission) => {
    const list = grouped.get(submission.titleSlug) ?? [];
    list.push(submission);
    grouped.set(submission.titleSlug, list);
  });

  return [...grouped.entries()]
    .map(([slug, submissions]) => {
      const sortedSubmissions = [...submissions].sort(sortByNewest);
      const latestSubmission = sortedSubmissions[0];
      const accepted = sortedSubmissions.some(
        (submission) => submission.statusDisplay === "Accepted",
      );
      const metadata = syncResult.problemMetadataBySlug?.[slug];

      return {
        id: `local-sync-${slug}`,
        title: metadata?.title ?? latestSubmission.title,
        slug,
        questionFrontendId: metadata?.questionFrontendId,
        difficulty: metadata?.difficulty ?? "Unknown",
        topics: metadata?.topicTags.map((topic) => topic.name) ?? [],
        topicTagSlugs: metadata?.topicTags.map((topic) => topic.slug) ?? [],
        latestStatus: latestSubmission.statusDisplay,
        latestSubmittedAt: toIsoTimestamp(latestSubmission.timestamp),
        status: accepted ? "accepted" : "attempted",
        source: "local-sync",
        url: metadata?.url,
      } satisfies SyncedTrackedProblem;
    })
    .sort((left, right) => right.latestSubmittedAt.localeCompare(left.latestSubmittedAt));
}

export function getSyncedTrackedProblemDetail(
  syncResult: LeetCodeSyncResult | null | undefined,
  slug: string,
): SyncedProblemDetail | undefined {
  if (!syncResult) {
    return undefined;
  }

  const matchingSubmissions = syncResult.recentSubmissions
    .filter((submission) => submission.titleSlug === slug)
    .sort(sortByNewest);

  if (!matchingSubmissions.length) {
    return undefined;
  }

  const accepted = matchingSubmissions.some(
    (submission) => submission.statusDisplay === "Accepted",
  );
  const metadata = syncResult.problemMetadataBySlug?.[slug];

  return {
    problem: {
      id: `local-sync-${slug}`,
      title: metadata?.title ?? matchingSubmissions[0].title,
      slug,
      questionFrontendId: metadata?.questionFrontendId,
      difficulty: metadata?.difficulty ?? "Unknown",
      topics: metadata?.topicTags.map((topic) => topic.name) ?? [],
      topicTagSlugs: metadata?.topicTags.map((topic) => topic.slug) ?? [],
      latestStatus: matchingSubmissions[0].statusDisplay,
      latestSubmittedAt: toIsoTimestamp(matchingSubmissions[0].timestamp),
      status: accepted ? "accepted" : "attempted",
      source: "local-sync",
      url: metadata?.url,
    },
    submissions: matchingSubmissions,
  };
}
