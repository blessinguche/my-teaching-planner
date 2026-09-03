import type {
  PeriodSlot,
  School,
  SchoolClosure,
  SchoolTerm,
} from "./types";

export const CLAYTON_HALL_ID = "school-clayton-hall";

export const CLAYTON_PERIODS: PeriodSlot[] = [
  { id: "p-tutor", name: "Tutor time", start: "08:45", end: "09:15", kind: "tutor" },
  { id: "p-1", name: "Period 1", start: "09:15", end: "10:05", kind: "lesson" },
  { id: "p-2", name: "Period 2", start: "10:05", end: "10:55", kind: "lesson" },
  { id: "p-break", name: "Break", start: "10:55", end: "11:15", kind: "break" },
  { id: "p-3", name: "Period 3", start: "11:15", end: "12:05", kind: "lesson" },
  { id: "p-4", name: "Period 4", start: "12:05", end: "12:55", kind: "lesson" },
  { id: "p-lunch", name: "Lunch", start: "12:55", end: "13:35", kind: "lunch" },
  { id: "p-5", name: "Period 5", start: "13:35", end: "14:25", kind: "lesson" },
  { id: "p-6", name: "Period 6", start: "14:25", end: "15:15", kind: "lesson" },
];

export const CLAYTON_TERMS: SchoolTerm[] = [
  {
    id: "t-aut1",
    name: "Autumn Term 1",
    start: "2026-09-03",
    end: "2026-10-23",
  },
  {
    id: "t-aut2",
    name: "Autumn Term 2",
    start: "2026-11-02",
    end: "2026-12-18",
  },
  {
    id: "t-spr1",
    name: "Spring Term 1",
    start: "2027-01-04",
    end: "2027-02-12",
  },
  {
    id: "t-spr2",
    name: "Spring Term 2",
    start: "2027-02-22",
    end: "2027-03-25",
  },
  {
    id: "t-sum1",
    name: "Summer Term 1",
    start: "2027-04-12",
    end: "2027-05-28",
  },
  {
    id: "t-sum2",
    name: "Summer Term 2",
    start: "2027-06-07",
    end: "2027-07-21",
  },
];

export const CLAYTON_CLOSURES: SchoolClosure[] = [
  {
    id: "c-inset-sep1",
    label: "INSET day",
    start: "2026-09-01",
    end: "2026-09-01",
    kind: "inset",
  },
  {
    id: "c-inset-sep2",
    label: "INSET day",
    start: "2026-09-02",
    end: "2026-09-02",
    kind: "inset",
  },
  {
    id: "c-inset-sep25",
    label: "INSET day",
    start: "2026-09-25",
    end: "2026-09-25",
    kind: "inset",
  },
  {
    id: "c-half-aut",
    label: "Half term",
    start: "2026-10-26",
    end: "2026-10-30",
    kind: "holiday",
  },
  {
    id: "c-inset-dec4",
    label: "INSET day",
    start: "2026-12-04",
    end: "2026-12-04",
    kind: "inset",
  },
  {
    id: "c-christmas",
    label: "Christmas holiday",
    start: "2026-12-21",
    end: "2027-01-01",
    kind: "holiday",
  },
  {
    id: "c-half-spr",
    label: "Half term",
    start: "2027-02-15",
    end: "2027-02-19",
    kind: "holiday",
  },
  {
    id: "c-inset-mar10",
    label: "INSET day",
    start: "2027-03-10",
    end: "2027-03-10",
    kind: "inset",
  },
  {
    id: "c-easter",
    label: "Easter holiday",
    start: "2027-03-26",
    end: "2027-04-09",
    kind: "holiday",
  },
  {
    id: "c-mayday",
    label: "May Day",
    start: "2027-05-04",
    end: "2027-05-04",
    kind: "bank",
  },
  {
    id: "c-half-sum",
    label: "Half term",
    start: "2027-05-31",
    end: "2027-06-04",
    kind: "holiday",
  },
  {
    id: "c-inset-jun25",
    label: "INSET day",
    start: "2027-06-25",
    end: "2027-06-25",
    kind: "inset",
  },
  {
    id: "c-summer",
    label: "Summer holiday",
    start: "2027-07-22",
    end: "2027-09-01",
    kind: "holiday",
  },
];

export function createClaytonHallSchool(): School {
  return {
    id: CLAYTON_HALL_ID,
    name: "Clayton Hall Academy",
    shortName: "Clayton Hall",
    academicYear: "2026–27",
    periods: CLAYTON_PERIODS,
    terms: CLAYTON_TERMS,
    closures: CLAYTON_CLOSURES,
    startNotes:
      "Students return Thu 3 Sep 2026. Y7 & Y11 from 8.40am; Y8–10 arrive breaktime (10.55–11.15). From Fri 4 Sep all year groups 8.15–8.40am; form line-up 8.40am.",
    createdAt: "2026-09-01T00:00:00.000Z",
  };
}

export function emptySchoolCollections() {
  return {
    classes: [] as import("./types").ClassGroup[],
    students: [] as import("./types").Student[],
    attendance: [] as import("./types").AttendanceRecord[],
    grades: [] as import("./types").GradeEntry[],
    behaviour: [] as import("./types").BehaviourLog[],
    homework: [] as import("./types").HomeworkItem[],
    comms: [] as import("./types").CommsLog[],
    contacts: [] as import("./types").ContactEntry[],
    schoolTodos: [] as import("./types").SchoolTodo[],
    goals: [] as import("./types").GoalItem[],
    pd: [] as import("./types").PdEntry[],
    supplies: [] as import("./types").SupplyItem[],
    projects: [] as import("./types").ProjectItem[],
    timetable: [] as import("./types").TimetableSlot[],
    lessons: [] as import("./types").LessonPlan[],
  };
}

/** Calendar-friendly rows from school closures (for hub / cal). */
export function closureEventsForSchool(school: School) {
  return school.closures.map((c) => ({
    id: `closure-${school.id}-${c.id}`,
    date: c.start,
    endDate: c.end,
    start: "00:00",
    end: "23:59",
    title: `${school.shortName}: ${c.label}`,
    detail: c.kind === "inset" ? "School closed to students" : undefined,
    kind: "personal" as const,
    module: "Break",
    track: "all" as const,
    schoolId: school.id,
    source: "school" as const,
  }));
}
