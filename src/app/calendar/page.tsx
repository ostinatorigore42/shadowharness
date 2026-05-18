"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarWeekView } from "@/components/CalendarWeekView";
import { useShadowStore } from "@/lib/store";
import type { CalendarEvent } from "@/lib/types";

const TYPE_LABELS: Record<CalendarEvent["type"], string> = {
  meeting: "Meeting",
  "deep-work": "Deep Work",
  personal: "Personal",
  blocked: "Blocked",
  plan: "Plan Block",
};

const TYPE_COLORS: Record<CalendarEvent["type"], string> = {
  meeting: "text-yellow-300 bg-yellow-500/10 border-yellow-500/30",
  "deep-work": "text-indigo-300 bg-indigo-500/10 border-indigo-500/30",
  personal: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  blocked: "text-red-300 bg-red-500/10 border-red-500/30",
  plan: "text-violet-300 bg-violet-500/10 border-violet-500/30",
};

type ExportStatus = "idle" | "loading" | "done" | "error" | "not-connected";

export default function CalendarPage() {
  const router = useRouter();
  const { calendarEvents, selectedVariationId, variations, reset, resetPlan } = useShadowStore();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");

  const selectedVariation = variations.find((v) => v.id === selectedVariationId);
  const generatedEvents = calendarEvents.filter((e) => e.source === "generated");
  const generatedCount = generatedEvents.length;

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((data: { connected: boolean }) => setGcalConnected(data.connected))
      .catch(() => {});
  }, []);

  function handleStartOver() {
    reset();
    router.push("/");
  }

  async function handleExport() {
    if (!gcalConnected) {
      window.location.href = "/api/calendar/auth";
      return;
    }
    setExportStatus("loading");
    try {
      const res = await fetch("/api/calendar/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: calendarEvents }),
      });
      if (res.status === 401) { setExportStatus("not-connected"); return; }
      const data: { exportedIds: string[] } = await res.json();
      setSyncedIds(new Set(data.exportedIds));
      setExportStatus("done");
    } catch {
      setExportStatus("error");
    }
  }

  const exportLabel: Record<ExportStatus, string> = {
    idle: gcalConnected ? "Export to Google Calendar" : "Connect & Export",
    loading: "Exporting…",
    done: `Exported ${syncedIds.size} events`,
    error: "Export failed — retry",
    "not-connected": "Not connected",
  };

  return (
    <main className="min-h-screen max-w-4xl mx-auto px-6 py-12">
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8">
        <span>Setup</span>
        <span>›</span>
        <span>Review</span>
        <span>›</span>
        <span>Plans</span>
        <span>›</span>
        <span className="text-[var(--accent-light)] font-medium">Calendar</span>
      </nav>

      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Your week is built</h1>
          <p className="text-gray-400">
            {selectedVariation && (
              <>
                <span className="text-[var(--accent-light)] font-medium">{selectedVariation.name}</span>
                {" — "}
              </>
            )}
            {generatedCount} goal blocks added to your calendar
          </p>
        </div>

        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <button
            onClick={handleExport}
            disabled={exportStatus === "loading"}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-60 ${
              exportStatus === "done"
                ? "border border-emerald-500/50 text-emerald-400 bg-emerald-500/10 cursor-default"
                : exportStatus === "error" || exportStatus === "not-connected"
                ? "border border-red-500/50 text-red-400 hover:bg-red-500/10"
                : "border border-[var(--border)] text-gray-300 hover:text-white hover:border-gray-500"
            }`}
          >
            {exportStatus !== "done" && <GoogleIcon />}
            {exportLabel[exportStatus]}
          </button>
          <button
            onClick={() => router.push("/report")}
            className="px-4 py-2 rounded-xl border border-[var(--accent)]/40 text-[var(--accent-light)] hover:bg-[var(--accent)]/10 text-sm font-medium transition-colors"
          >
            Generate report
          </button>
          <button
            onClick={() => { resetPlan(); router.push("/review"); }}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-gray-400 hover:text-white hover:border-gray-500 text-sm font-medium transition-colors"
          >
            Regenerate plan
          </button>
          <button
            onClick={handleStartOver}
            className="px-4 py-2 rounded-xl border border-[var(--border)] text-gray-500 hover:text-white hover:border-gray-500 text-sm transition-colors"
          >
            Start over
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {selectedVariation && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs text-gray-500 mb-1">Plan</p>
            <p className="font-bold text-white">{selectedVariation.name}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs text-gray-500 mb-1">Goal blocks</p>
            <p className="font-bold text-white">{generatedCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-xs text-gray-500 mb-1">Total events</p>
            <p className="font-bold text-white">{calendarEvents.length}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="text-xs text-gray-600 mb-3">Click any event for details</p>
        <CalendarWeekView events={calendarEvents} onEventClick={setSelectedEvent} />
      </div>

      {/* Sync status — shown after export */}
      {exportStatus === "done" && generatedCount > 0 && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-xs text-emerald-400 font-semibold mb-3">Google Calendar sync results</p>
          <div className="flex flex-col gap-1.5">
            {generatedEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-xs">
                <span className={syncedIds.has(e.id) ? "text-emerald-400" : "text-red-400"}>
                  {syncedIds.has(e.id) ? "✓" : "✗"}
                </span>
                <span className={syncedIds.has(e.id) ? "text-gray-300" : "text-gray-500"}>
                  {e.title} — {e.day} {e.startHour}:00–{e.endHour}:00
                </span>
                <span className={`ml-auto font-medium ${syncedIds.has(e.id) ? "text-emerald-500" : "text-gray-600"}`}>
                  {syncedIds.has(e.id) ? "synced" : "local only"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedVariation && (
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--accent-light)] font-semibold uppercase tracking-wider mb-1">
            The Bet
          </p>
          <p className="text-sm text-gray-300">{selectedVariation.central_bet}</p>
          <div className="flex gap-1.5 items-start mt-1">
            <span className="text-yellow-400 text-xs mt-0.5 flex-shrink-0">⚠</span>
            <p className="text-xs text-yellow-200/70">{selectedVariation.central_trap}</p>
          </div>
        </div>
      )}

      {/* Event detail drawer */}
      {selectedEvent && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setSelectedEvent(null)}
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-[var(--card)] border-l border-[var(--border)] p-6 overflow-y-auto animate-slide-in-right">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-base font-bold text-white leading-snug pr-2">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-gray-300 text-xl leading-none flex-shrink-0 transition-colors"
              >
                ×
              </button>
            </div>

            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border mb-4 ${TYPE_COLORS[selectedEvent.type]}`}>
              {TYPE_LABELS[selectedEvent.type]}
            </span>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Time</p>
                <p className="text-sm text-gray-300">
                  {selectedEvent.day} · {selectedEvent.startHour}:00 – {selectedEvent.endHour}:00
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {selectedEvent.endHour - selectedEvent.startHour}h block
                </p>
              </div>

              {selectedEvent.description && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.goalRef && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Linked goal</p>
                  <p className="text-sm text-[var(--accent-light)]">{selectedEvent.goalRef}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500 mb-1">Source</p>
                <p className="text-sm text-gray-400">
                  {selectedEvent.source === "generated" ? "AI generated" : "Existing commitment"}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
