import { addDays } from "./dates";
import type { PlannerEvent, School, TimetableSlot } from "./types";

/** JS getDay() → timetable day (Mon=1 … Fri=5). Weekend → null. */
export function isoToTimetableDay(iso: string): 1 | 2 | 3 | 4 | 5 | null {
  const [y, m, d] = iso.split("-").map(Number);
  const jsDay = new Date(y!, m! - 1, d!).getDay();
  if (jsDay === 0 || jsDay === 6) return null;
  return jsDay as 1 | 2 | 3 | 4 | 5;
}

function schoolClosedOn(school: School, iso: string): boolean {
  return school.closures.some((c) => c.start <= iso && iso <= c.end);
}

/** One day’s teaching slots as calendar events (empty class names skipped). */
export function timetableEventsOnDate(
  schools: School[],
  slots: TimetableSlot[],
  iso: string,
  schoolId?: string,
): PlannerEvent[] {
  const day = isoToTimetableDay(iso);
  if (!day) return [];

  const schoolById = new Map(schools.map((s) => [s.id, s]));
  const out: PlannerEvent[] = [];

  for (const slot of slots) {
    if (slot.day !== day) continue;
    if (schoolId && slot.schoolId !== schoolId) continue;
    const className = slot.className.trim();
    if (!className) continue;

    const school = schoolById.get(slot.schoolId);
    if (!school) continue;
    if (schoolClosedOn(school, iso)) continue;

    const period = school.periods.find((p) => p.id === slot.periodId);
    if (!period) continue;

    const bits = [period.name];
    if (slot.subject?.trim()) bits.push(slot.subject.trim());
    if (slot.room?.trim()) bits.push(`Rm ${slot.room.trim()}`);

    out.push({
      id: `tt-${slot.id}-${iso}`,
      date: iso,
      start: period.start,
      end: period.end,
      title: `${school.shortName}: ${className}`,
      detail: bits.join(" · "),
      kind: "meeting",
      module: period.name,
      track: "all",
      schoolId: school.id,
      source: "school",
    });
  }

  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/** Expand filled timetable slots across an inclusive date range. */
export function timetableEventsForRange(
  schools: School[],
  slots: TimetableSlot[],
  fromISO: string,
  toISO: string,
  schoolId?: string,
): PlannerEvent[] {
  if (!slots.length || fromISO > toISO) return [];
  const out: PlannerEvent[] = [];
  for (let iso = fromISO; iso <= toISO; iso = addDays(iso, 1)) {
    out.push(...timetableEventsOnDate(schools, slots, iso, schoolId));
  }
  return out;
}
