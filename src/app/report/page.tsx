"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useShadowStore } from "@/lib/store";

interface ReportData {
  narrative: string;
  topBet: string;
  warning: string;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const { goals, variations, selectedVariationId, calendarEvents } = useShadowStore();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const variation = variations.find((v) => v.id === selectedVariationId);
  const generated = calendarEvents.filter((e) => e.source === "generated");

  // Compute stats client-side
  const totalHours = generated.reduce((sum, e) => sum + (e.endHour - e.startHour), 0);
  const deepWorkHours = generated
    .filter((e) => e.type === "deep-work")
    .reduce((sum, e) => sum + (e.endHour - e.startHour), 0);
  const meetingHours = generated
    .filter((e) => e.type === "meeting")
    .reduce((sum, e) => sum + (e.endHour - e.startHour), 0);

  // Hours per goal
  const goalHours = goals.map((g) => {
    const hrs = generated
      .filter((e) => e.goalRef?.toLowerCase().includes(g.text.toLowerCase().slice(0, 20)))
      .reduce((sum, e) => sum + (e.endHour - e.startHour), 0);
    return { goal: g, hrs };
  }).sort((a, b) => b.hrs - a.hrs);

  useEffect(() => {
    if (!variation) { router.push("/calendar"); return; }

    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals, variation, calendarEvents }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReport(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-12">
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8">
        <span>Setup</span><span>›</span>
        <span>Review</span><span>›</span>
        <span>Plans</span><span>›</span>
        <span>Calendar</span><span>›</span>
        <span className="text-[var(--accent-light)] font-medium">Report</span>
      </nav>

      <h1 className="text-3xl font-black text-white mb-1">Weekly debrief</h1>
      <p className="text-gray-400 mb-8">
        {variation && <><span className="text-[var(--accent-light)]">{variation.name}</span> — </>}
        here's why your week was built this way.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="Goal blocks" value={generated.length} sub={`${totalHours}h total`} />
        <StatCard label="Deep work" value={`${deepWorkHours}h`} sub="focused time" />
        <StatCard label="Meetings" value={`${meetingHours}h`} sub="collaboration" />
      </div>

      {/* Per-goal breakdown */}
      {goalHours.some((g) => g.hrs > 0) && (
        <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-4">
            Hours per goal
          </p>
          <div className="space-y-3">
            {goalHours.map(({ goal, hrs }) => (
              <div key={goal.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 truncate pr-4">{goal.text}</span>
                  <span className="text-gray-500 flex-shrink-0">{hrs}h</span>
                </div>
                <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all duration-700"
                    style={{ width: totalHours > 0 ? `${(hrs / totalHours) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI narrative */}
      {loading && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3 animate-pulse">
          <div className="h-3 bg-[var(--muted)] rounded w-3/4" />
          <div className="h-3 bg-[var(--muted)] rounded w-full" />
          <div className="h-3 bg-[var(--muted)] rounded w-5/6" />
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {report && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs text-[var(--accent-light)] font-semibold uppercase tracking-wider mb-3">
              Honest take
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">{report.narrative}</p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
              Top bet
            </p>
            <p className="text-sm text-gray-300">{report.topBet}</p>
          </div>

          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-1">
              Watch out
            </p>
            <p className="text-sm text-gray-300">{report.warning}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <button
          onClick={() => router.push("/calendar")}
          className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-gray-400 hover:text-white hover:border-gray-500 text-sm font-medium transition-colors"
        >
          ← Back to calendar
        </button>
      </div>
    </main>
  );
}
