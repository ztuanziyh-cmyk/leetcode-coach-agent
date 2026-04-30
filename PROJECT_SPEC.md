# LeetCode Review Tracker Project Spec

## 1. Overview

### Goal
Build a personal LeetCode review tracker that combines imported public LeetCode progress with manual review metadata, so a user can identify weak areas and review the right problems each day.

### Core User Value
- Sync a public LeetCode profile by username
- See solved problems and recent submissions in one place
- Add structured review notes per problem
- Generate a daily review queue
- Surface weak topics, patterns, and trends over time

### Non-Goals for V1
- No authentication
- No multi-user collaboration
- No real database integration yet
- No write-back to LeetCode
- No browser extension or editor plugin

## 2. Product Scope

### Primary User
A single learner preparing for interviews who solves LeetCode problems and wants a disciplined review workflow rather than a solve-count dashboard.

### Primary Use Cases
1. Enter a LeetCode username and sync public profile data.
2. Browse solved problems and recent submissions.
3. Open a problem and record review notes.
4. Mark confidence and mistake patterns after solving or revisiting.
5. Open a daily review page and work through a generated queue.
6. Review stats to understand weak topics and repeated mistakes.

## 3. Functional Requirements

### 3.1 Username Sync
- User can enter a public LeetCode username.
- App fetches public progress data for that username.
- App stores synced data locally in mock storage for V1.
- User can manually trigger re-sync.
- App shows last synced time.

### 3.2 Solved Problems Tracking
- App stores problem metadata for solved problems.
- Each problem record should include title, slug, difficulty, topics, status, and first/last solved dates when available.
- User can filter and sort solved problems.
- User can distinguish between imported LeetCode data and manual review state.

### 3.3 Recent Submissions
- App shows a recent submissions feed.
- Each submission entry should include problem, timestamp, status, language if available, and runtime/memory placeholders if not available from mock data.
- User can click from a submission to the related problem review page.

### 3.4 Manual Review Notes
- User can add and edit review notes per problem.
- Notes should support:
  - freeform summary
  - confidence
  - mistake type
  - pattern
  - key takeaway
  - next review date
  - last reviewed date
- User can update notes independently of sync data.

### 3.5 Daily Review List
- App generates a daily review list from tracked problems.
- Generation should prioritize:
  - low-confidence problems
  - overdue reviews
  - recently failed or retried problems
  - problems tied to repeated mistake types or weak topics
- User can mark an item reviewed for the day.
- User can regenerate the list from the current dataset.

### 3.6 Weak Topics and Statistics
- App shows a dashboard of weak areas and progress.
- Stats should include:
  - total solved
  - solved by difficulty
  - solved by topic
  - recent submission outcomes
  - confidence distribution
  - most common mistake types
  - most common patterns
  - overdue review count

## 4. UX Requirements

### Design Principles
- Fast to scan
- Optimized for review workflow, not just analytics
- Manual note-taking should be lightweight
- Review state must remain visible alongside imported LeetCode data

### Core Interaction Patterns
- Global username context shown in header
- Problem list supports search, filter, and sort
- Problem detail page acts as the source of truth for review notes
- Daily review page should reduce decision fatigue by presenting a ready-made queue

## 5. Page List

### 5.1 Dashboard
**Route:** `/`

**Purpose**
High-level overview of sync status, today’s review workload, and weak areas.

**Sections**
- Username sync card
- Summary stats
- Daily review preview
- Weak topics preview
- Recent submissions preview

### 5.2 Problems
**Route:** `/problems`

**Purpose**
Browse all tracked problems.

**Key Features**
- Search by title or slug
- Filter by difficulty
- Filter by topic
- Filter by confidence
- Filter by review status
- Sort by last solved, last reviewed, confidence, title

### 5.3 Problem Detail / Review
**Route:** `/problems/[slug]`

**Purpose**
View imported problem info and manage manual review notes.

**Sections**
- Problem metadata
- Submission history for this problem
- Review notes form
- Review history summary
- Next review recommendation

### 5.4 Recent Submissions
**Route:** `/submissions`

**Purpose**
Inspect recent LeetCode activity.

**Key Features**
- Reverse chronological feed
- Filter by accepted vs non-accepted
- Link to problem detail page

### 5.5 Daily Review
**Route:** `/review`

**Purpose**
Present the generated review queue for the day.

**Key Features**
- Queue ordered by priority
- Quick review metadata
- Mark as reviewed
- Refresh or regenerate list

### 5.6 Statistics
**Route:** `/stats`

**Purpose**
Show long-term trends and weak spots.

**Sections**
- Solved counts
- Topic breakdown
- Confidence distribution
- Mistake type frequency
- Pattern frequency
- Overdue reviews

## 6. Data Model

V1 uses mock data and local in-memory or local file-backed fixtures. The model should still be designed to map cleanly to future Supabase tables.

### 6.1 UserProfile
```ts
type UserProfile = {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  ranking?: number;
  totalSolved?: number;
  easySolved?: number;
  mediumSolved?: number;
  hardSolved?: number;
  lastSyncedAt?: string;
};
```

### 6.2 Problem
```ts
type Problem = {
  id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  status: "solved" | "attempted" | "review";
  source: "leetcode";
  firstSolvedAt?: string;
  lastSolvedAt?: string;
  acceptanceRate?: number;
  url?: string;
};
```

### 6.3 Submission
```ts
type Submission = {
  id: string;
  problemSlug: string;
  submittedAt: string;
  status: "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Runtime Error" | "Other";
  language?: string;
  runtimeMs?: number;
  memoryMb?: number;
};
```

### 6.4 ReviewNote
```ts
type ReviewNote = {
  id: string;
  problemSlug: string;
  summary: string;
  confidence: 1 | 2 | 3 | 4 | 5;
  mistakeType:
    | "None"
    | "Logic"
    | "Edge Case"
    | "Syntax"
    | "Time Complexity"
    | "Space Complexity"
    | "Data Structure Choice"
    | "Pattern Recognition"
    | "Careless Mistake"
    | "Other";
  pattern:
    | "Two Pointers"
    | "Sliding Window"
    | "Binary Search"
    | "DFS"
    | "BFS"
    | "Dynamic Programming"
    | "Greedy"
    | "Backtracking"
    | "Heap"
    | "Graph"
    | "Tree"
    | "Prefix Sum"
    | "Union Find"
    | "Other";
  keyTakeaway: string;
  nextReviewAt?: string;
  lastReviewedAt?: string;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
};
```

### 6.5 ReviewSession
```ts
type ReviewSession = {
  id: string;
  problemSlug: string;
  reviewedAt: string;
  confidenceAfterReview: 1 | 2 | 3 | 4 | 5;
  notes?: string;
};
```

### 6.6 DailyReviewItem
```ts
type DailyReviewItem = {
  id: string;
  date: string;
  problemSlug: string;
  priorityScore: number;
  reasons: string[];
  completed: boolean;
  completedAt?: string;
};
```

## 7. Derived Logic

### Daily Review Prioritization Rules
Suggested initial scoring model:
- +5 if review is overdue
- +4 if confidence is 1 or 2
- +3 if last submission was not accepted
- +2 if problem belongs to a weak topic
- +2 if mistake type appears frequently
- +1 if not reviewed recently

### Weak Topic Detection
A topic can be considered weak if one or more are true:
- below-average confidence across problems in that topic
- higher-than-average mistake frequency
- low accepted rate in recent submissions
- high overdue review count

## 8. Mock Data Requirements for V1

The first version should include seeded mock data for:
- 1 sample user profile
- 30 to 50 problems across multiple difficulties and topics
- recent submissions with mixed outcomes
- review notes for a meaningful subset of problems
- review sessions to support stats and review history

Mock data should be realistic enough to validate:
- topic filters
- weak-topic aggregation
- daily review generation
- problem detail editing flows

## 9. Future Supabase Mapping

Supabase is out of scope for V1, but the spec should preserve a clean transition path.

### Likely Future Tables
- `profiles`
- `problems`
- `submissions`
- `review_notes`
- `review_sessions`
- `daily_review_items`

### Migration Expectations
- Keep IDs stable and string-based
- Separate imported LeetCode data from user-authored review data
- Avoid coupling UI state to mock-data shape
- Structure services so mock and Supabase backends can share interfaces

## 10. Implementation Phases

### Phase 1: Foundation and Mock Data
**Goal**
Establish app structure and local data layer.

**Deliverables**
- App Router page skeletons
- shared TypeScript types
- mock dataset
- mock repository or service layer
- base navigation and layout

### Phase 2: Sync and Data Display
**Goal**
Make imported LeetCode-style data visible throughout the app.

**Deliverables**
- username input
- mock sync action
- dashboard summary
- problems list
- recent submissions page
- problem detail metadata

### Phase 3: Review Workflow
**Goal**
Enable manual review tracking.

**Deliverables**
- review notes form
- confidence, mistake type, pattern, takeaway fields
- review session tracking
- last reviewed and next review logic

### Phase 4: Daily Review Engine
**Goal**
Turn tracked data into an actionable daily queue.

**Deliverables**
- daily review generation logic
- review list page
- mark-as-reviewed interaction
- priority scoring explanation in UI

### Phase 5: Statistics and Weak Topic Insights
**Goal**
Expose patterns across solved problems and reviews.

**Deliverables**
- stats page
- weak topic calculations
- confidence and mistake breakdowns
- overdue review summaries

### Phase 6: Persistence and Supabase Integration
**Goal**
Replace mock storage with a real backend.

**Deliverables**
- Supabase schema
- data access layer swap
- persistence for notes, sessions, and review list
- sync history storage

## 11. Open Decisions

These should be resolved before implementation starts:
- Which public LeetCode endpoint or scraping strategy will be used for username sync?
- Whether daily review generation should be purely deterministic or allow manual pinning
- Whether a problem can have one active note record or multiple historical note entries
- Whether confidence should use a 1 to 5 scale or a simpler low/medium/high scale
- Whether stats should be snapshot-based or computed on demand in V1

## 12. Acceptance Criteria for V1 Spec Completion

This spec is complete enough to start implementation when:
- pages and routes are agreed
- entities and fields are agreed
- V1 scope is clearly separated from future Supabase work
- daily review behavior is defined well enough for a first implementation
- mock-data-first architecture is explicit
