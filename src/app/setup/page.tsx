"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoalsList } from "@/components/GoalsList";
import { CalendarWeekView } from "@/components/CalendarWeekView";
import { useShadowStore } from "@/lib/store";
import { MOCK_CALENDAR_EVENTS } from "@/lib/mock-calendar";
import type { CalendarEvent } from "@/lib/types";

export default function SetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { goals, setGoals, setDocumentsContext } = useShadowStore();

  const [docText, setDocText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewEvents, setPreviewEvents] = useState<CalendarEvent[]>(MOCK_CALENDAR_EVENTS);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    setCalendarLoading(true);
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((data: { events: CalendarEvent[]; connected: boolean }) => {
        setGcalConnected(data.connected);
        if (data.connected) {
          setPreviewEvents(data.events.filter((e) => e.source === "existing"));
        }
      })
      .catch(() => {})
      .finally(() => setCalendarLoading(false));
  }, []);

  async function processFile(file: File) {
    setUploading(true);
    try {
      if (file.type === "application/pdf") {
        const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: { str?: string }) => item.str ?? "").join(" ") + "\n";
        }
        setDocText(text.slice(0, 4000));
        setDocumentsContext(text.slice(0, 4000));
      } else {
        const text = await file.text();
        setDocText(text.slice(0, 4000));
        setDocumentsContext(text.slice(0, 4000));
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  }

  function handleSubmit() {
    if (goals.length === 0) {
      alert("Add at least one goal before continuing.");
      return;
    }
    router.push("/review");
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-6 py-12">
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8 animate-fade-in-up">
        <span className="text-[var(--accent-light)] font-medium">Setup</span>
        <span>›</span>
        <span>Review</span>
        <span>›</span>
        <span>Plans</span>
        <span>›</span>
        <span>Calendar</span>
      </nav>

      <h1 className="text-3xl font-black text-white mb-1 animate-fade-in-up stagger-1">Set the stage</h1>
      <p className="text-gray-400 mb-10 animate-fade-in-up stagger-2">Give your better self what it needs to plan your week.</p>

      {/* Goals */}
      <section className="mb-10 animate-fade-in-up stagger-2">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
          Goals — ranked by priority
        </h2>
        <GoalsList goals={goals} onChange={setGoals} />
      </section>

      {/* Calendar preview */}
      <section className="mb-10 animate-fade-in-up stagger-4">
        <div className="flex items-center justify-between mb-3 gap-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Your existing calendar this week
          </h2>
          {gcalConnected ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Google Calendar connected
            </span>
          ) : (
            <a
              href="/api/calendar/auth"
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--muted)] border border-[var(--border)] text-gray-300 hover:border-[var(--accent)] hover:text-white transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <GoogleIcon />
              Connect Google Calendar
            </a>
          )}
        </div>

        {searchParams.get("gcal") === "denied" && (
          <p className="text-xs text-yellow-500 mb-2">Access was denied. Using mock events.</p>
        )}
        {searchParams.get("gcal") === "error" && (
          <p className="text-xs text-red-400 mb-2">Could not connect to Google Calendar. Using mock events.</p>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          {calendarLoading ? (
            <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
              Loading calendar…
            </div>
          ) : (
            <CalendarWeekView events={previewEvents} />
          )}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {gcalConnected
            ? "Showing your real Google Calendar events. Your better self will plan around them."
            : "Showing mock events. Connect Google Calendar to use your real schedule."}
        </p>
      </section>

      {/* Doc upload */}
      <section className="mb-10 animate-fade-in-up stagger-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
          Upload context docs{" "}
          <span className="text-gray-600 normal-case font-normal">(optional)</span>
        </h2>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            isDragOver
              ? "border-[var(--accent)] bg-indigo-500/5 scale-[1.01]"
              : "border-[var(--border)] hover:border-[var(--accent)]/60"
          }`}
        >
          <input
            type="file"
            accept=".pdf,.txt,.md"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileUpload}
          />
          <div className="pointer-events-none">
            <div className="text-2xl mb-2">{uploading ? "⏳" : docText ? "✅" : "📄"}</div>
            <p className="text-gray-300 text-sm font-medium mb-1">
              {uploading ? "Processing..." : docText ? "File loaded" : "Drop a file here, or click to browse"}
            </p>
            <p className="text-gray-600 text-xs">PDF, TXT, MD — project briefs, notes, CRM exports</p>
          </div>
        </div>
        {docText && (
          <p className="text-xs text-[var(--accent-light)] mt-2">
            {docText.length.toLocaleString()} characters extracted and ready
          </p>
        )}
      </section>

      <button
        onClick={handleSubmit}
        className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-indigo-500 text-white font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] animate-fade-in-up stagger-6"
      >
        Let's go
      </button>
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
