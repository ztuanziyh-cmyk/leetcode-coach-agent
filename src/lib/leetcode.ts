type LeetCodeProfileQueryResponse = {
  data?: {
    matchedUser: {
      username: string;
      profile: {
        realName: string | null;
        userAvatar: string | null;
        ranking: number | null;
      } | null;
      submitStatsGlobal: {
        acSubmissionNum: Array<{
          difficulty: "All" | "Easy" | "Medium" | "Hard";
          count: number;
        }>;
      } | null;
    } | null;
    recentSubmissionList: Array<{
      title: string;
      titleSlug: string;
      timestamp: string;
      statusDisplay: string;
      lang: string;
    }> | null;
  };
  errors?: Array<{
    message: string;
  }>;
};

type LeetCodeQuestionMetadataQueryResponse = {
  data?: {
    question: {
      questionFrontendId: string;
      title: string;
      titleSlug: string;
      difficulty: "Easy" | "Medium" | "Hard";
      topicTags: Array<{
        name: string;
        slug: string;
      }>;
    } | null;
  };
  errors?: Array<{
    message: string;
  }>;
};

export type LeetCodeSyncSubmission = {
  title: string;
  titleSlug: string;
  timestamp: string;
  statusDisplay: string;
  lang: string;
};

export type LeetCodeProblemMetadata = {
  questionFrontendId: string;
  title: string;
  titleSlug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topicTags: Array<{
    name: string;
    slug: string;
  }>;
  url: string;
};

export type LeetCodeSyncResult = {
  username: string;
  realName: string | null;
  userAvatar: string | null;
  ranking: number | null;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  recentSubmissions: LeetCodeSyncSubmission[];
  problemMetadataBySlug?: Record<string, LeetCodeProblemMetadata>;
};

const LEETCODE_GRAPHQL_ENDPOINT = "https://leetcode.com/graphql";

const SYNC_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        realName
        userAvatar
        ranking
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
    recentSubmissionList(username: $username) {
      title
      titleSlug
      timestamp
      statusDisplay
      lang
    }
  }
`;

const QUESTION_METADATA_QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionFrontendId
      title
      titleSlug
      difficulty
      topicTags {
        name
        slug
      }
    }
  }
`;

function getSolvedCount(
  counts: NonNullable<
    NonNullable<
      NonNullable<LeetCodeProfileQueryResponse["data"]>["matchedUser"]
    >["submitStatsGlobal"]
  >["acSubmissionNum"],
  difficulty: "All" | "Easy" | "Medium" | "Hard",
) {
  return counts.find((entry) => entry.difficulty === difficulty)?.count ?? 0;
}

export function normalizeLeetCodeUsername(username: string) {
  return username.trim();
}

export function isValidLeetCodeUsername(username: string) {
  return /^[A-Za-z0-9_-]{1,30}$/.test(username);
}

async function fetchProblemMetadataBySlug(titleSlug: string) {
  const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: QUESTION_METADATA_QUERY,
      variables: { titleSlug },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return undefined;
  }

  const payload = (await response.json()) as LeetCodeQuestionMetadataQueryResponse;

  if (payload.errors?.length || !payload.data?.question) {
    return undefined;
  }

  return {
    questionFrontendId: payload.data.question.questionFrontendId,
    title: payload.data.question.title,
    titleSlug: payload.data.question.titleSlug,
    difficulty: payload.data.question.difficulty,
    topicTags: payload.data.question.topicTags,
    url: `https://leetcode.com/problems/${payload.data.question.titleSlug}/`,
  } satisfies LeetCodeProblemMetadata;
}

async function fetchProblemMetadataMap(submissions: LeetCodeSyncSubmission[]) {
  const uniqueSlugs = [...new Set(submissions.map((submission) => submission.titleSlug))];

  const metadataEntries = await Promise.all(
    uniqueSlugs.map(async (titleSlug) => {
      const metadata = await fetchProblemMetadataBySlug(titleSlug);
      return metadata ? [titleSlug, metadata] : undefined;
    }),
  );

  return Object.fromEntries(
    metadataEntries.filter((entry): entry is [string, LeetCodeProblemMetadata] => Boolean(entry)),
  );
}

export async function fetchLeetCodeSyncPreview(
  rawUsername: string,
): Promise<LeetCodeSyncResult> {
  const username = normalizeLeetCodeUsername(rawUsername);

  if (!username) {
    throw new Error("Username is required.");
  }

  if (!isValidLeetCodeUsername(username)) {
    throw new Error("Username must use only letters, numbers, underscores, or hyphens.");
  }

  const response = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: SYNC_QUERY,
      variables: { username },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`LeetCode request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as LeetCodeProfileQueryResponse;

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? "LeetCode returned an unknown error.");
  }

  const matchedUser = payload.data?.matchedUser;

  if (!matchedUser) {
    throw new Error("User not found on LeetCode.");
  }

  const solvedCounts = matchedUser.submitStatsGlobal?.acSubmissionNum ?? [];
  const recentSubmissions = payload.data?.recentSubmissionList ?? [];
  const problemMetadataBySlug = await fetchProblemMetadataMap(recentSubmissions);

  return {
    username: matchedUser.username,
    realName: matchedUser.profile?.realName ?? null,
    userAvatar: matchedUser.profile?.userAvatar ?? null,
    ranking: matchedUser.profile?.ranking ?? null,
    totalSolved: getSolvedCount(solvedCounts, "All"),
    easySolved: getSolvedCount(solvedCounts, "Easy"),
    mediumSolved: getSolvedCount(solvedCounts, "Medium"),
    hardSolved: getSolvedCount(solvedCounts, "Hard"),
    recentSubmissions,
    problemMetadataBySlug,
  };
}
