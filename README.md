# Shadow Harness

A weekly planner that asks: what would a smarter version of you actually do this week?

You give it your goals and your calendar. It asks a few sharp questions. Then it generates two concrete weekly plans — different strategic bets, not just different schedules — and blocks out your time accordingly.

---

## What it does

1. **Setup** — rank your goals, add context per goal, optionally upload a doc (PDF, TXT)
2. **Review** — the AI analyzes your situation and asks clarifying questions (energy, tradeoffs, risk posture). Uses web search if you mention specific people or companies.
3. **Plans** — two variations with different strategic bets. Each includes a kill list, ready-to-send message drafts, and a pre-mortem. You can comment on a plan to refine it.
4. **Calendar** — approved plan gets time-blocked into your week. Export to Google Calendar if connected.

---

## Stack

- Next.js 15 App Router
- Claude Sonnet (Anthropic) — streaming, parallel generation, web search
- Zustand with persist
- Tailwind CSS 4
- Google Calendar OAuth (optional)

---

## Running locally

```bash
git clone https://github.com/ostinatorigore42/shadowharness.git
cd shadowharness
npm install
cp .env.example .env.local
# add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

1. Import the repo in Vercel
2. Add `ANTHROPIC_API_KEY` in Environment Variables
3. Deploy

Google Calendar integration is optional. Without it the app uses a mock calendar.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | From [console.anthropic.com](https://console.anthropic.com) |
| `GOOGLE_CLIENT_ID` | No | For real Google Calendar sync |
| `GOOGLE_CLIENT_SECRET` | No | For real Google Calendar sync |
| `GOOGLE_REDIRECT_URI` | No | e.g. `https://yourapp.vercel.app/api/calendar/callback` |
