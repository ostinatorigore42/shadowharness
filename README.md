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

