# Octogen

Ask your repo anything — AI answers grounded in your actual code, not guesses.

![Octogen demo](docs/demo.gif)
<!-- Replace docs/demo.gif with real recording: create project, ask a question, upload a meeting -->

## What is this?

You know that feeling? You join a new repo — 800 files, no docs, last commit says `fix stuff` — and you spend three days `scan`-ing just to find where auth actually happens. Octogen fixes that.

Octogen is three small pieces that work together:

1. **A Next.js app** (`src/`) — dashboard for Q&A, commits, meetings, and billing.
2. **Postgres + pgvector** — stores per-file AI summaries + 768-dim embeddings.
3. **AI services** — Gemini for answers/embeddings, Groq for commit diffs, AssemblyAI for meeting transcripts.

The trick is simple: paste a GitHub URL and Octogen clones it, summarizes every file, and embeds it. Then every question is vector search → grounded answer. So `https://github.com/you/my-api` + `Where is auth handled?` returns the real files, for every teammate on the same project.

         Think ChatGPT, but with your codebase.

## Motivation

Repo knowledge is lost on every fresh clone — `grep` finds text, not meaning, and chatbots don't know your code, so teams re-find the same entrypoints and re-explain the layout for each new hire.

- Shared context: one indexed project, same answers for the whole team.
- Faster onboarding: clone logic — ask `how does billing work?` instead of reading 50 files.
- Stay in flow: streamed answers with file references instead of tab-hopping.

## Quick Start

First visit this link: [https://octogen-rouge.vercel.app/](https://octogen-rouge.vercel.app/)

No install needed — just a browser and a GitHub repo URL. For private repos, have a GitHub token ready.

### 1. Sign in

Open the live link above → Sign up / Sign in via Clerk → you'll land on `/dashboard`.

### 2. Create a project

- Go to `/create` → project name + GitHub repository URL (+ optional token for private repos)
- Check the credit cost before confirming (`1 file = 1 credit`, you start with `150` free)
- Confirm → Octogen indexes the repo (summarize + embed each file)

### 3. Ask and browse commits

- Stay on `/dashboard` → ask `Where is auth handled?` → streamed answer with referenced files
- Save useful answers to `/qa` for the team
- Scroll to see the latest 15 commits with AI summaries

### 4. Meetings, team, and credits

- `/meetings` — drop an audio file (MP3/WAV/M4A/AAC/FLAC, up to 50MB) → chapters become issues
- `/join/[projectId]` — share the invite link so teammates get the same project
- `/billing` — check balance, move the slider to buy more (`$2 per 100 credits`)

See `## Usage` below for the daily loop. Want to run it locally instead? See `## Contributing`.

## Usage

Available pages (all under `(protected)/` — sign-in required):

- `/dashboard` — ask questions, browse latest 15 commits with AI summaries, see team avatars
- `/qa` — saved Q&A history for the team
- `/meetings` — drag-and-drop audio (MP3/WAV/M4A/AAC/FLAC, up to 50MB), auto-chapters become issues
- `/create` — new project from a GitHub URL, shows file-count cost before indexing
- `/billing` — credit balance + slider to buy (`$2 per 100 credits`)
- `/join/[projectId]` — shareable invite link, teammates get the same commits / Q&A / meetings

Behavior notes:

- Indexing is per-project and costs `1 credit per file` — you start with `150` free.
- Only the `main` branch is indexed. No incremental re-index yet — updates need a re-create.
- Commits are pulled on dashboard load, not via webhooks.
- Meeting upload goes browser → AssemblyAI directly, so Vercel's 4.5MB limit doesn't bite.

> [!NOTE]
> **Test Environment:** Stripe is in test mode. No real payments are processed. Use [Stripe test cards](https://stripe.com/docs/testing) to try checkout.

## Examples

Ask about the codebase:

```text
Dashboard > Ask: "Where is auth handled and how does the session flow work?"
-> streamed markdown answer + referenced files with syntax-highlighted code
-> Save to /qa for the team
```

Turn a standup into issues:

```text
/meetings > drop standup.mp3 > auto-transcribe
-> chapters become issues: headline + summary + gist + start/end
```

Invite and top up:

```text
Share: https://octogen-rouge.vercel.app/join/<projectId>
Billing: move slider to 300 credits -> Stripe Checkout -> credits added via webhook
```

## What's in the repo?

```
prisma/
  schema.prisma           → User, Project, Commit, SourceCodeEmbedding (vector(768)), Meeting, Issue
src/
  app/(protected)/        → dashboard/, qa/, meetings/, create/, billing/, join/[projectId]/
  app/api/                → trpc/, upload-meeting/, process-meeting/, webhook/stripe/
  lib/                    → github.ts, github-loader.ts, ai-providers.ts, assembly.ts, stripe.ts
  server/api/routers/     → project.ts (CRUD, commits, Q&A, meetings, billing)
  hooks/                  → use-projects.ts, use-refetch.ts
  env.js                  → type-safe env validation
start-database.sh         → Docker/Podman Postgres launcher
Technical_Documentation.md → architecture, RAG flow, decisions, challenges, limits, deployment
```

## For more technical info

Skipping the deep dive here on purpose. For architecture diagrams, RAG pipeline, tiered models, pgvector setup, challenges, and deployment — checkout `Technical_Documentation.md`.

## Contributing

### Clone the repo

```bash
git clone https://github.com/SplinterSword/octogen.git
cd octogen
```

### Local dev

Prereqs: Node.js 18+, Bun, Docker or Podman, plus keys for Clerk / GitHub / Gemini / Groq / AssemblyAI / Stripe.

```bash
bun install
cp .env.example .env  # fill in DATABASE_URL + API keys, see below
chmod +x start-database.sh
./start-database.sh
bunx prisma db push
bun run dev
```

Condensed env — full table lives in `Technical_Documentation.md`:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/octogen
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
GITHUB_TOKEN=
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
ASSEMBLY_AI_API_KEY=
NEXT_PUBLIC_ASSEMBLY_AI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Starts a Postgres container named `octogen-postgres`. Needs the `pgvector` extension.

Point at `http://localhost:3000`, create a project from a small public repo first to save credits.

### Run checks

```bash
bun run check    # lint + typecheck
bun run build    # production build
bun run db:studio # inspect Postgres
```

### Submit a pull request

Fork the repo and open a PR to `main`. Keep it scoped — one feature / fix per PR.
