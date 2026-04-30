# LeetCode Coach Agent

LeetCode Coach Agent is a practical LLM agent and learning assistant project built from a LeetCode review tracker. It helps users sync public LeetCode activity, track review notes, schedule problem reviews, and use an LLM coach for hint-first learning.

The app turns public LeetCode submissions into a lightweight review workflow: sync a public username, import recent submissions, enrich problems with difficulty and topics, review progress over time, and ask the coach for structured guidance when stuck.

## Core Features

- Public LeetCode username sync
- Recent submissions tracking
- Problem metadata enrichment with difficulty and topics
- Problem list search, filter, and sort
- Local review notes
- Review state and review history
- Automatic next review scheduling
- Stats page
- JSON export/import
- Supabase manual cloud backup/restore
- LLM Coach Agent powered by the OpenAI API
- Hint-first coaching instead of directly giving final answers
- Generated review note draft
- Save coach draft into existing review notes
- Vercel deployment

## LLM Coach Agent

The coach is designed to guide thinking instead of immediately giving the final solution. Users enter a problem title or slug, their current idea, where they are stuck, and optional code.

The coach returns:

- Pattern guess
- Layered hints
- Brute-force idea
- Optimized direction
- Key takeaway
- Review note draft

The generated review note draft can be saved into the existing problem notes, so coaching sessions become part of the review workflow.

## Vibe Coding Note

This project was built through an iterative vibe coding workflow:

1. Design one small feature
2. Ask Codex to implement it
3. Test locally
4. Commit
5. Deploy

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- `localStorage`
- LeetCode public GraphQL
- OpenAI API
- Vercel

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` and configure the values needed by the features you use:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
OPENAI_COACH_MODEL=
```

`OPENAI_COACH_MODEL` is optional.

Security notes:

- `OPENAI_API_KEY` must stay server-side only.
- Do not commit `.env.local`.
- Do not expose the OpenAI key with a `NEXT_PUBLIC_` prefix.

## Usage Flow

1. Go to `/sync`.
2. Enter a public LeetCode username.
3. Sync public activity.
4. Review and organize problems in `/problems`.
5. Add local notes and review state on problem detail pages.
6. Use `/review` for scheduled review.
7. Use the coach when stuck, then save useful drafts back into review notes.

## Data and Privacy

- No LeetCode password is required.
- LeetCode sync uses public data only.
- Data is stored locally in the browser by default.
- Optional Supabase backup/restore uses your configured Supabase project.
- OpenAI API usage may incur cost.

## Current Limitations

- Supabase cloud backup/restore is manual, not automatic sync yet.
- LeetCode sync uses public data only.
- LLM coach quality depends on user input.
- API usage may incur cost.

## Roadmap

- Automatic cloud sync
- Deeper coach integration with review history
- Weak-topic-based problem recommendation
- Multi-agent coach workflow
- Better mobile UI
