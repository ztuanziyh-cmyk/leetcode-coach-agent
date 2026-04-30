# LeetCode Coach Agent

LeetCode Coach Agent is a vibe coding project built from a LeetCode review tracker and extended into a multi-agent LeetCode learning assistant. It combines public LeetCode activity sync, review tracking, LLM-powered single-problem coaching, weak-topic study planning, Supabase manual cloud backup/restore, and a Vercel deployment used for personal use.

## Core Features

- Public LeetCode username sync
- Recent submissions tracking
- Problem metadata enrichment
- Problem search, filter, and sort
- Review notes
- Review state and review history
- Next review scheduling
- Statistics and weak topic overview
- JSON export/import
- Supabase manual cloud backup/restore
- OpenAI-powered Coach Agent
- Agent trace
- Save coach draft to review notes
- Weak Topic Study Planner Agent

## Multi-Agent Architecture

The single-problem coach uses specialist agents for pattern detection, layered hints, optional code review, and review-note drafting. The study planner uses tracker data to generate grounded multi-day plans.

- Coach Manager
- Pattern Agent
- Hint Agent
- Code Review Agent
- Review Note Agent
- Study Planner Agent

## Main Pages

- Dashboard
- Problems
- Submissions
- Daily Review
- Coach
- Study Planner
- Statistics
- Settings

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- OpenAI API
- OpenAI Agents SDK
- `localStorage`
- LeetCode public GraphQL
- Vercel

## Local Setup

```bash
npm install
npm run dev
```

## Environment Variables

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
- Public deployment should add authentication or rate limiting before being shared broadly.
- This README intentionally does not include the live Vercel URL.

## Current Limitations

- Supabase cloud backup/restore is manual, not automatic sync yet.
- LeetCode sync uses public data only.
- Coach and planner quality depends on user input and local tracker data.
- OpenAI API usage may incur cost.
- Public sharing should wait until auth or rate limiting is added.

## Roadmap

- Automatic cloud sync
- Stronger personalization from review history
- Better mobile layout
- Request limits or auth for public deployment
- Richer multi-agent planning
- Optional MCP or external tool integrations later
