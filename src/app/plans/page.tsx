"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanCard } from "@/components/PlanCard";
import { useShadowStore } from "@/lib/store";
import { MOCK_CALENDAR_EVENTS } from "@/lib/mock-calendar";
import type { PlanVariation } from "@/lib/types";

const SHADOW_MOODS = [
  { label: "Sizing up your week",         icon: "◎" },
  { label: "Questioning your priorities", icon: "⟳" },
  { label: "Stress-testing the schedule", icon: "◈" },
  { label: "Finding where time leaks",    icon: "◐" },
  { label: "Identifying the real bets",   icon: "◆" },
  { label: "Cutting what doesn't matter", icon: "◇" },
  { label: "Drafting the kill list",      icon: "⊘" },
  { label: "Mapping the failure modes",   icon: "◑" },
  { label: "Thinking through tradeoffs",  icon: "◉" },
  { label: "Writing the artifacts",       icon: "◎" },
  { label: "Blocking out the hours",      icon: "▣" },
  { label: "Weighing the two paths",       icon: "◈" },
  { label: "Making the hard calls",       icon: "◆" },
  { label: "Locking in the calendar",     icon: "▣" },
];

function ShadowThinking() {
  const [moodIdx, setMoodIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMoodIdx((i) => (i + 1) % SHADOW_MOODS.length);
        setVisible(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const mood = SHADOW_MOODS[moodIdx];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 flex items-center gap-3">
      <span className="text-violet-400 text-lg leading-none animate-pulse">{mood.icon}</span>
      <span
        className="text-sm text-gray-300 font-medium transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {mood.label}
      </span>
      <span className="ml-auto flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-violet-400"
            style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-pulse">
      <div className="h-5 bg-[var(--muted)] rounded-lg w-2/5 mb-2" />
      <div className="h-3 bg-[var(--muted)] rounded-lg w-3/4 mb-1.5" />
      <div className="h-3 bg-[var(--muted)] rounded-lg w-1/2 mb-4" />
      <div className="h-3 bg-[var(--muted)] rounded-lg w-1/4 mb-3" />
      <div className="h-40 bg-[var(--muted)] rounded-lg" />
      <div className="h-9 bg-[var(--muted)] rounded-lg mt-3" />
    </div>
  );
}

function parseResponse({ raw, slot }: { raw: string; slot: 0 | 1 }): PlanVariation {
  let cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
  const v: PlanVariation = JSON.parse(cleaned);
  v.id = v.id ?? `var-${slot}`;
  return v;
}

export default function PlansPage() {
  const router = useRouter();
  const {
    goals, currentState, documentsContext, questions, answers,
    variations, setVariations, selectVariation, selectedVariationId,
    setCalendarEvents,
  } = useShadowStore();

  async function handleRefine(variationId: string, comment: string) {
    const variation = variations.find((v) => v.id === variationId);
    if (!variation) return;
    const res = await fetch("/api/refine-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variation,
        comment,
        goals,
        questions,
        answers,
        existingEvents: MOCK_CALENDAR_EVENTS,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `Refinement failed (${res.status})`);
    }
    const refined: PlanVariation = await res.json();
    setVariations(variations.map((v) => (v.id === variationId ? refined : v)));
  }

  const [loadingSlots, setLoadingSlots] = useState<[boolean, boolean]>(
    variations.length === 0 ? [true, true] : [false, false]
  );
  const [error, setError] = useState("");
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const loading = loadingSlots[0] || loadingSlots[1];

  useEffect(() => {
    if (variations.length > 0) return;

    setError("");
    const payload = {
      goals,
      currentState,
      documentsContext,
      existingEvents: MOCK_CALENDAR_EVENTS,
      questions,
      answers,
    };

    async function fetchSlot(slot: 0 | 1): Promise<PlanVariation> {
      const res = await fetch("/api/generate-variation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, ...payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
      }
      return parseResponse({ raw: full, slot });
    }

    fetchSlot(0)
      .then((v) => {
        setVariations((prev) => {
          const next = [...prev];
          next[0] = v;
          return next;
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not generate plan A."))
      .finally(() => setLoadingSlots((s) => [false, s[1]]));

    fetchSlot(1)
      .then((v) => {
        setVariations((prev) => {
          const next = [...prev];
          next[1] = v;
          return next;
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not generate plan B."))
      .finally(() => setLoadingSlots((s) => [s[0], false]));
  }, [fetchTrigger]);

  async function handleApprove() {
    if (!selectedVariationId) {
      alert("Select a plan first.");
      return;
    }
    const selected = variations.find((v) => v.id === selectedVariationId);
    if (!selected) return;

    try {
      await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: selected.events }),
      });
      setCalendarEvents([...MOCK_CALENDAR_EVENTS, ...selected.events]);
      router.push("/calendar");
    } catch {
      setError("Failed to save to calendar.");
    }
  }

  function handleRegenerate() {
    setVariations([]);
    setError("");
    setLoadingSlots([true, true]);
    setFetchTrigger((n) => n + 1);
  }

  return (
    <main className="min-h-screen max-w-5xl mx-auto px-6 py-12">
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8">
        <span>Setup</span>
        <span>›</span>
        <span>Review</span>
        <span>›</span>
        <span className="text-[var(--accent-light)] font-medium">Plans</span>
        <span>›</span>
        <span>Calendar</span>
      </nav>

      <h1 className="text-3xl font-black text-white mb-1">Choose your week</h1>
      <p className="text-gray-400 mb-8">
        Your better self generated 2 options. Pick the one that fits.
      </p>

      {loading && <ShadowThinking />}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={handleRegenerate}
            className="px-4 py-2 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {(loading || variations.length > 0) && (
        <>
          <div className="grid md:grid-cols-2 gap-4 mb-8 mt-4">
            {[0, 1].map((slot) => {
              const v = variations[slot];
              if (loadingSlots[slot as 0 | 1]) return <SkeletonCard key={slot} />;
              if (!v) return null;
              return (
                <PlanCard
                  key={v.id}
                  variation={v}
                  selected={selectedVariationId === v.id}
                  onSelect={() => selectVariation(v.id)}
                  onRefine={(comment) => handleRefine(v.id, comment)}
                  allVariations={variations.filter(Boolean)}
                />
              );
            })}
          </div>

          {!loading && variations.filter(Boolean).length > 0 && (
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleRegenerate}
                className="px-6 py-2.5 rounded-xl border border-[var(--border)] text-gray-400 hover:text-white hover:border-gray-500 text-sm font-medium transition-colors"
              >
                Regenerate
              </button>
              <button
                onClick={handleApprove}
                disabled={!selectedVariationId}
                className="px-8 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Approve & stuff my calendar
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
