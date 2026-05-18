"use client";

import type { CalendarEvent } from "@/lib/types";
import { DAYS_ORDER, WORK_HOURS } from "@/lib/mock-calendar";

const EVENT_COLORS: Record<CalendarEvent["type"], string> = {
  meeting: "bg-yellow-500/20 border-yellow-500/40 text-yellow-200",
  "deep-work": "bg-indigo-500/20 border-indigo-500/40 text-indigo-200",
  personal: "bg-emerald-500/20 border-emerald-500/40 text-emerald-200",
  blocked: "bg-red-500/20 border-red-500/40 text-red-200",
  plan: "bg-violet-500/20 border-violet-500/40 text-violet-200",
};

const DAY_NAMES: CalendarEvent["day"][] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_HEIGHT = 48;
const HOURS = Array.from(
  { length: WORK_HOURS.end - WORK_HOURS.start },
  (_, i) => WORK_HOURS.start + i
);

interface CalendarWeekViewProps {
  events: CalendarEvent[];
  compact?: boolean;
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarWeekView({ events, compact = false, onEventClick }: CalendarWeekViewProps) {
  const hourH = compact ? 32 : HOUR_HEIGHT;
  const today = DAY_NAMES[new Date().getDay()];

  function getEventStyle(event: CalendarEvent) {
    const top = (event.startHour - WORK_HOURS.start) * hourH;
    const height = Math.max((event.endHour - event.startHour) * hourH - 2, hourH / 2);
    return { top, height };
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-[var(--border)]">
          <div className="p-2" />
          {DAYS_ORDER.map((day) => (
            <div
              key={day}
              className={`p-2 text-center text-xs font-semibold uppercase tracking-wider ${
                day === today ? "text-[var(--accent-light)]" : "text-gray-400"
              }`}
            >
              {day}
              {day === today && (
                <span className="ml-1 inline-block w-1 h-1 rounded-full bg-[var(--accent-light)] align-middle" />
              )}
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="relative grid grid-cols-8" style={{ height: HOURS.length * hourH }}>
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute w-full text-right pr-2 text-[10px] text-gray-600"
                style={{ top: (h - WORK_HOURS.start) * hourH - 6 }}
              >
                {h}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS_ORDER.map((day) => {
            const dayEvents = events.filter((e) => e.day === day);
            const isToday = day === today;
            return (
              <div
                key={day}
                className={`relative border-l border-[var(--border)] ${isToday ? "bg-indigo-500/[0.03]" : ""}`}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-[var(--border)]/40"
                    style={{ top: (h - WORK_HOURS.start) * hourH }}
                  />
                ))}
                {/* Events */}
                {dayEvents.map((event) => {
                  const { top, height } = getEventStyle(event);
                  const colorClass = EVENT_COLORS[event.type] ?? EVENT_COLORS["plan"];
                  const clickable = !!onEventClick;
                  return (
                    <div
                      key={event.id}
                      className={`group absolute left-0.5 right-0.5 rounded border px-1 py-0.5 overflow-visible ${colorClass} ${
                        event.source === "generated" ? "ring-1 ring-violet-400/30" : ""
                      } ${clickable ? "cursor-pointer hover:brightness-125 transition-all" : ""}`}
                      style={{ top, height }}
                      onClick={clickable ? () => onEventClick(event) : undefined}
                    >
                      <p className="text-[10px] font-semibold leading-tight truncate">{event.title}</p>
                      {!compact && height > 30 && (
                        <p className="text-[9px] opacity-70 truncate">{event.startHour}:00 – {event.endHour}:00</p>
                      )}

                      {/* Custom tooltip */}
                      {!compact && (event.description || event.goalRef) && (
                        <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 z-50 hidden group-hover:block">
                          <div className="bg-gray-900 border border-[var(--border)] rounded-lg px-3 py-2 text-xs shadow-xl w-52">
                            <p className="font-semibold text-white mb-0.5">{event.title}</p>
                            <p className="text-gray-400">{event.startHour}:00 – {event.endHour}:00</p>
                            {event.description && (
                              <p className="text-gray-300 mt-1">{event.description}</p>
                            )}
                            {event.goalRef && (
                              <p className="text-[var(--accent-light)] mt-1 text-[10px]">Goal: {event.goalRef}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        {!compact && (
          <div className="flex gap-4 mt-3 flex-wrap">
            {(Object.entries(EVENT_COLORS) as [CalendarEvent["type"], string][]).map(([type, cls]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className={`w-3 h-3 rounded border ${cls}`} />
                {type}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
