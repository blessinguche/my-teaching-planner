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

/** `tt:slotId:YYYY-MM-DD` or merged `tt:slotA+slotB:YYYY-MM-DD` */
export function timetableSlotIdsFromEventId(id: string): string[] {
  if (!id.startsWith("tt:")) return [];
  const rest = id.slice(3);
  const colon = rest.lastIndexOf(":");
  if (colon < 0) return [];
  return rest
    .slice(0, colon)
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Merge identical back-to-back lessons into one longer block. */
export function mergeAdjacentTimetableEvents(
  events: PlannerEvent[],
): PlannerEvent[] {
  if (events.length < 2) return events;

  const sorted = [...events].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.schoolId ?? "").localeCompare(b.schoolId ?? "") ||
      a.title.localeCompare(b.title) ||
      a.start.localeCompare(b.start),
  );

  const merged: PlannerEvent[] = [];
  for (const ev of sorted) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.date === ev.date &&
      prev.schoolId === ev.schoolId &&
      prev.title === ev.title &&
      prev.end === ev.start
    ) {
      const prevSlots = timetableSlotIdsFromEventId(prev.id);
      const nextSlots = timetableSlotIdsFromEventId(ev.id);
      const modules = [prev.module, ev.module].filter(Boolean) as string[];
      const details = [prev.detail, ev.detail].filter(Boolean) as string[];
      prev.end = ev.end;
      prev.id = `tt:${[...prevSlots, ...nextSlots].join("+")}:${prev.date}`;
      if (modules.length) {
        prev.module = [...new Set(modules)].join(" · ");
      }
      if (details.length) {
        const unique = [...new Set(details)];
        prev.detail = unique.length === 1 ? unique[0]! : unique.join(" → ");
      }
      continue;
    }
    merged.push({ ...ev });
  }

  return merged.sort((a, b) => a.start.localeCompare(b.start));
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
      id: `tt:${slot.id}:${iso}`,
      date: iso,
      start: period.start,
      end: period.end,
      title: className,
      detail: bits.join(" · "),
      kind: "meeting",
      module: period.name,
      track: "all",
      schoolId: school.id,
      source: "school",
    });
  }

  return mergeAdjacentTimetableEvents(out);
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
