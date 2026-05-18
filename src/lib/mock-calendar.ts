import type { CalendarEvent } from "./types";

const DAY_OFFSET: Record<CalendarEvent["day"], number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
};

// Returns the next Monday (or next Monday if today is Monday) as the week base
export function getWeekStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  // Days until next Monday: if Mon→7, else compute forward
  const daysToMonday = ((8 - dayOfWeek) % 7) || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  return monday;
}

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "existing-1",
    title: "Weekly team standup",
    day: "Mon",
    startHour: 9,
    endHour: 10,
    description: "Recurring team sync — 1hr",
    type: "meeting",
    source: "existing",
  },
  {
    id: "existing-2",
    title: "1:1 with manager",
    day: "Tue",
    startHour: 14,
    endHour: 15,
    description: "Status update and blockers",
    type: "meeting",
    source: "existing",
  },
  {
    id: "existing-3",
    title: "Lunch with Alex",
    day: "Wed",
    startHour: 12,
    endHour: 13,
    description: "Optional networking lunch",
    type: "personal",
    source: "existing",
  },
  {
    id: "existing-4",
    title: "Product review",
    day: "Wed",
    startHour: 15,
    endHour: 16,
    description: "Monthly product review meeting",
    type: "meeting",
    source: "existing",
  },
  {
    id: "existing-5",
    title: "Sprint planning",
    day: "Thu",
    startHour: 10,
    endHour: 12,
    description: "2-week sprint kickoff",
    type: "meeting",
    source: "existing",
  },
  {
    id: "existing-6",
    title: "Gym",
    day: "Fri",
    startHour: 7,
    endHour: 8,
    description: "Morning workout",
    type: "personal",
    source: "existing",
  },
];

// Returns MOCK_CALENDAR_EVENTS enriched with actual ISO date strings for the coming week
export function getMockCalendarEvents(): CalendarEvent[] {
  const weekStart = getWeekStart();
  return MOCK_CALENDAR_EVENTS.map((e) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + DAY_OFFSET[e.day]);
    return { ...e, date: d.toISOString().slice(0, 10) };
  });
}

export const DAYS_ORDER: CalendarEvent["day"][] = [
  "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
];

export const WORK_HOURS = { start: 7, end: 22 };
