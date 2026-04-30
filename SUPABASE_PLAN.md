# Supabase Integration Plan

## Overview

This document proposes a cloud persistence plan for LeetCode Review Tracker that preserves the current local-first behavior.

Current app behavior:
- Public LeetCode sync runs client -> app API -> LeetCode GraphQL
- The normalized sync result is stored in `localStorage`
- Review notes are stored in `localStorage`
- Review history is stored in `localStorage`
- JSON export/import is available in Settings

Goal of the first Supabase phase:
- Add optional cloud persistence
- Keep the app working without Supabase
- Avoid rewriting the current data model into many normalized tables too early
- Make backup/restore the first cloud use case before automatic sync

## Design Principles

- Local-first remains the default UX.
- Supabase is an additional persistence layer, not an immediate replacement.
- Use JSONB for the first schema so the existing app payloads can be stored with minimal transformation.
- Keep one logical user dataset together for simpler backup, restore, and migration.
- Delay aggressive normalization until the product model stabilizes.

## What Needs To Be Stored

The cloud layer should be able to store:
- latest LeetCode sync result
- enriched problem metadata
- local review notes
- review history
- backup metadata such as exported/imported timestamps

The current app already has a practical payload boundary:
- sync result object
- review notes map keyed by problem slug
- review history map keyed by problem slug

That maps well to JSONB storage.

## Recommended First Schema

Use two tables:
1. `user_datasets`
2. `sync_runs`

This gives one current source-of-truth row per signed-in user later, while still allowing sync history if needed.

### Table 1: `user_datasets`

Purpose:
- Store the current app state snapshot for one user
- Power cloud backup/restore
- Keep writes simple

Suggested columns:
- `id`
- `user_id`
- `version`
- `latest_sync_result` JSONB
- `review_notes` JSONB
- `review_history` JSONB
- `settings_snapshot` JSONB optional
- `created_at`
- `updated_at`

### Table 2: `sync_runs`

Purpose:
- Optional audit/history of LeetCode sync attempts
- Useful later for debugging, sync history, and rollbacks

Suggested columns:
- `id`
- `user_id`
- `leetcode_username`
- `sync_result` JSONB
- `created_at`

This table is optional for the first release of cloud backup, but it is useful if you want historical sync snapshots without mutating the main dataset row.

## SQL Schema

Assumption:
- Supabase Auth will be added later, even if the first cloud UI is manual backup/restore only.
- Tables should still be keyed by `auth.users.id`.

```sql
create extension if not exists pgcrypto;

create table if not exists public.user_datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  version integer not null default 1,
  latest_sync_result jsonb not null default '{}'::jsonb,
  review_notes jsonb not null default '{}'::jsonb,
  review_history jsonb not null default '{}'::jsonb,
  settings_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  leetcode_username text not null,
  sync_result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sync_runs_user_id_created_at
  on public.sync_runs (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_datasets_updated_at on public.user_datasets;

create trigger trg_user_datasets_updated_at
before update on public.user_datasets
for each row
execute function public.set_updated_at();
```

## Row Level Security

Enable RLS immediately, even if cloud features are introduced later.

```sql
alter table public.user_datasets enable row level security;
alter table public.sync_runs enable row level security;
```

Policies:

```sql
create policy "users can read own dataset"
on public.user_datasets
for select
using (auth.uid() = user_id);

create policy "users can insert own dataset"
on public.user_datasets
for insert
with check (auth.uid() = user_id);

create policy "users can update own dataset"
on public.user_datasets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can read own sync runs"
on public.sync_runs
for select
using (auth.uid() = user_id);

create policy "users can insert own sync runs"
on public.sync_runs
for insert
with check (auth.uid() = user_id);
```

## Why JSONB First

This app already has stable high-level payloads but still-evolving fields:
- LeetCode sync result may change
- problem metadata shape may grow
- review notes may gain fields
- review history may gain tags or duration data

JSONB first avoids premature normalization.

Benefits:
- minimal mapping code
- fast migration from current `localStorage`
- easier backup/export parity
- simpler rollback if the schema changes

Tradeoffs:
- weaker relational querying
- more application-side validation
- harder analytics directly in SQL

That tradeoff is acceptable for the next phase because the immediate goal is persistence, not warehouse-style reporting.

## Suggested JSON Shapes

### `latest_sync_result`

Store the current normalized sync payload close to the existing local structure:

```json
{
  "syncedAt": "2026-04-29T14:10:00.000Z",
  "data": {
    "username": "some-user",
    "realName": "Some User",
    "userAvatar": "https://...",
    "ranking": 12345,
    "totalSolved": 420,
    "easySolved": 150,
    "mediumSolved": 220,
    "hardSolved": 50,
    "recentSubmissions": [],
    "problemMetadataBySlug": {}
  }
}
```

### `review_notes`

Keep the current slug-keyed map:

```json
{
  "two-sum": {
    "problemSlug": "two-sum",
    "reviewState": "Need Review",
    "confidence": 2,
    "mistakeType": "Pattern Recognition",
    "pattern": "Hash Table",
    "coreIdea": "Store complements in a map.",
    "whyMissed": "Looked for sorting first.",
    "keyTakeaway": "Check one-pass hash map first.",
    "nextReviewDate": "2026-04-30",
    "freeformNotes": "Remember duplicate edge cases.",
    "updatedAt": "2026-04-29T14:12:00.000Z"
  }
}
```

### `review_history`

Keep the current slug-keyed grouped map:

```json
{
  "two-sum": [
    {
      "id": "uuid",
      "problemSlug": "two-sum",
      "reviewedAt": "2026-04-29T14:20:00.000Z",
      "result": "Remembered",
      "confidenceBefore": 2,
      "confidenceAfter": 3,
      "nextReviewDate": "2026-05-06",
      "note": "Faster recall this time."
    }
  ]
}
```

## Environment Variables

### Local Development

Add to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Notes:
- `NEXT_PUBLIC_SUPABASE_URL` is used by the browser/client app.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe for public client use when protected by RLS.
- `SUPABASE_SERVICE_ROLE_KEY` should only be used in server-only code or admin scripts.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

### Vercel

Add the same values in Vercel project environment settings:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Recommended scope:
- Preview
- Production
- Development if using Vercel dev env pull

## Coexistence Model

The app should keep three persistence modes:
1. local browser state
2. local JSON export/import
3. optional Supabase cloud copy

### Source of Truth Strategy

For the next phase, the source of truth should remain local browser state.

That means:
- existing pages continue reading from `localStorage`
- Supabase does not silently overwrite local data
- cloud actions are explicit from Settings

### Recommended Behavior

- App starts from `localStorage` exactly as it does today.
- Export JSON continues to export local app data only.
- Import JSON continues to replace local app data only.
- Supabase backup uploads the current local state snapshot.
- Supabase restore downloads the cloud snapshot and writes it into localStorage.

This keeps the current app architecture stable.

## Phased Migration Plan

## Phase 1: Add Supabase Project And Schema

Deliverables:
- create Supabase project
- run schema SQL
- enable RLS
- create policies
- store env vars locally and in Vercel

Decisions:
- no UI changes required yet
- no runtime dependency on Supabase yet

Success criteria:
- schema exists
- a test user can store one dataset row manually

## Phase 2: Add Supabase Client

Deliverables:
- add browser/client helper
- add server helper if needed for protected operations
- define typed wrappers for:
  - save dataset snapshot
  - load dataset snapshot
  - append sync run optional

Implementation guidance:
- keep helpers isolated under `src/lib/supabase/`
- do not replace current `localStorage` hooks
- do not auto-load cloud data on app startup yet

Success criteria:
- authenticated requests can read/write `user_datasets`
- existing local-only behavior remains unchanged when Supabase is not configured

## Phase 3: Add Manual Cloud Backup/Restore In Settings

Deliverables:
- Settings page gets:
  - "Back up to cloud"
  - "Restore from cloud"
  - "Last cloud backup time"
- backup pushes current local app data to `user_datasets`
- restore pulls current cloud snapshot and writes it into localStorage

Behavior:
- manual only
- explicit confirmation before overwriting local data from cloud
- explicit confirmation before overwriting cloud data from local

Success criteria:
- user can move data between browsers by logging in and restoring from cloud
- existing JSON export/import still works

## Phase 4: Add Optional Automatic Sync Later

Possible future options:
- auto-backup local changes after note edits
- auto-backup after LeetCode sync
- resolve local-vs-cloud conflicts with timestamps
- optionally store sync history in `sync_runs`

Recommended rule for first auto-sync:
- local changes write locally first
- then enqueue cloud backup
- if cloud backup fails, local app still works

Success criteria:
- cloud persistence becomes convenient, not fragile
- local-first UX remains intact

## Conflict Handling

Do not attempt complex merge logic in the first cloud phase.

For manual backup/restore:
- local -> cloud backup replaces the cloud snapshot
- cloud -> local restore replaces the local snapshot

Show these timestamps to the user:
- local last synced at
- local last note update if available
- cloud updated at

Later, if automatic sync is added, the app can introduce:
- "Use newer version"
- "Keep local"
- "Keep cloud"

## Recommended App-Level Data Contract

To keep local, JSON, and Supabase aligned, define one shared serializable shape:

```ts
type AppLocalDataSnapshot = {
  version: 1;
  exportedAt: string;
  data: {
    localSyncResult: unknown | null;
    reviewNotes: Record<string, unknown>;
    reviewHistory: Record<string, unknown>;
  };
};
```

That same shape can be used for:
- JSON export
- JSON import validation
- Supabase `user_datasets` mapping

Supabase does not need to store the outer export wrapper exactly, but the payloads should remain structurally aligned.

## Minimal Validation Rules

When restoring from Supabase:
- verify top-level object exists
- verify `version` is supported if stored
- verify JSON objects are objects, not arrays
- default missing sections to empty objects
- never crash on unknown extra fields

The app already follows a tolerant localStorage model. Supabase restore should do the same.

## Future Normalization Path

If the app eventually needs richer SQL querying, split gradually:

- `profiles`
- `problem_notes`
- `review_history_entries`
- `leetcode_sync_profiles`
- `leetcode_problem_metadata`

Do that only when one of these becomes a real need:
- multi-device live sync
- complex SQL stats
- cross-user analytics
- admin tooling

Until then, JSONB is the lower-risk choice.

## Recommendation Summary

- Keep localStorage as the active runtime store.
- Add Supabase as an optional cloud snapshot layer.
- Start with one `user_datasets` JSONB row per user.
- Optionally store sync history in `sync_runs`.
- Ship manual cloud backup/restore before automatic sync.
- Keep JSON export/import as a separate backup path.
- Normalize later only if query complexity actually demands it.
