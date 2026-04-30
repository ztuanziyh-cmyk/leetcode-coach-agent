# LeetCode Coach Agent

LeetCode Coach Agent is a vibe coding project that grew from a LeetCode review tracker into a multi-agent LeetCode learning assistant. It helps users sync public LeetCode activity, track review notes, schedule problem reviews, get hint-first coaching on individual problems, and generate weak-topic study plans from local tracker data.

The app combines a practical review workflow with LLM-powered coaching: public username sync, recent submission tracking, problem metadata enrichment, local notes and review history, an OpenAI-powered Coach Agent, a Weak Topic Study Planner Agent, manual Supabase cloud backup/restore, and Vercel deployment.

## Core Features

- LeetCode public username sync
- Recent submissions tracking
- Problem metadata enrichment with difficulty and topics
- Problem search, filter, and sort
- Review notes saved locally
- Review state and review history
- Automatic next review scheduling
- Stats and weak topic overview
- JSON export/import
- Supabase manual cloud backup/restore
- OpenAI-powered Coach Agent
- Agent trace for coach and planner runs
- Save coach draft to review notes
- Weak Topic Study Planner Agent

## Multi-Agent Architecture

The coach system is organized around small specialist agents coordinated by a manager:

- Coach Manager orchestrates single-problem coaching.
- Pattern Agent identifies the likely problem-solving pattern.
- Hint Agent generates layered, hint-first guidance.
- Code Review Agent reviews optional user code without jumping straight to a full solution.
- Review Note Agent creates structured review note drafts.
- Study Planner Agent builds short study plans from weak topics, due reviews, confidence, mistake types, and patterns.

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

- Do not commit `.env.local`.
- `OPENAI_API_KEY` must stay server-side only.
- Do not use a `NEXT_PUBLIC_` prefix for the OpenAI API key.

## Current Limitations

- Supabase backup/restore is manual, not automatic sync.
- LeetCode sync uses public data only.
- Coach and planner quality depends on user input and local tracker data.
- OpenAI API usage may cost money.

## Roadmap

- Automatic cloud sync
- Stronger personalization from review history
- Better mobile layout
- Richer multi-agent planning
- Optional MCP/tool integrations later
