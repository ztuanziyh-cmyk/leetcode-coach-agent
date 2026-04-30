# LeetCode Review Tracker

This is a personal LeetCode review tracker built as a vibe coding project.

The app helps track solved problems, review notes, weak topics, and daily review. It turns public LeetCode activity into a lightweight review workflow by syncing a public username, importing recent submissions, enriching problem metadata, and managing review progress locally in the browser with optional cloud backup.

## Core Features

- Public LeetCode username sync
- Recent submissions tracking
- Problem metadata enrichment
- Local review notes
- Review state and review history
- Automatic next review scheduling
- Search, filter, and sort
- Real stats
- JSON export/import
- Supabase cloud backup/restore
- Vercel deployment

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- `localStorage`
- LeetCode public GraphQL

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create a local environment file and configure:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Usage Flow

1. Go to `/sync`
2. Enter a LeetCode username
3. Sync public data
4. Review problems in `/problems`
5. Add notes in a problem detail page
6. Use `/review` for daily review

## Data and Privacy

- No LeetCode password
- No cookies
- Data is stored locally in the browser by default
- Optional Supabase backup/restore uses your configured public client keys

## Current Limitations

- Only recent public submissions are synced
- Supabase cloud backup/restore is manual, not automatic sync yet
- No account login yet

## Vibe Coding Note

This project was developed through an iterative vibe coding workflow: design the feature, ask Codex to implement a small phase, test locally, commit, and deploy.
