import type { PlannerEvent } from "./types";

export type CalendarSourceId = "qts" | "deadlines" | `school:${string}`;

export const SCHOOL_SWATCHES = [
  "var(--planner-teal)",
  "var(--mint)",
  "var(--sky)",
  "var(--peach)",
  "var(--butter)",
  "var(--planner-teal-deep)",
] as const;

export const SOURCE_COLORS: Record<"qts" | "deadlines", string> = {
  qts: "var(--mint)",
  deadlines: "var(--peach)",
};

export function schoolSwatch(index: number): string {
  return SCHOOL_SWATCHES[index % SCHOOL_SWATCHES.length]!;
}

/** Which calendar checklist row an event belongs to. */
export function eventCalendarSource(ev: PlannerEvent): CalendarSourceId {
  if (ev.kind === "deadline" || ev.isAssessment) return "deadlines";
  if (ev.schoolId) return `school:${ev.schoolId}`;
  if (ev.source === "school" && ev.schoolId) return `school:${ev.schoolId}`;
  // QTS / NIoT / programme / personal training
  return "qts";
}

export function eventMatchesSources(
  ev: PlannerEvent,
  enabled: Set<CalendarSourceId>,
): boolean {
  return enabled.has(eventCalendarSource(ev));
}

/** Google-style all-day: breaks, multi-day, full-day window, or due-only deadlines. */
export function isAllDayEvent(ev: PlannerEvent): boolean {
  if (ev.module === "Break") return true;
  if (ev.endDate && ev.endDate !== ev.date) return true;
  if (ev.kind === "deadline" || ev.isAssessment) {
    if (!ev.start || ev.start === ev.end || (ev.start === "09:00" && ev.end === "09:00")) {
      return true;
    }
  }
  if (ev.start === "00:00" && (ev.end === "23:59" || ev.end === "24:00")) return true;
  return false;
}

export function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export type CalendarToggle = {
  id: CalendarSourceId;
  label: string;
  color: string;
};
