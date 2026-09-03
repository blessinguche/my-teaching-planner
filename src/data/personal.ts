import { createSeedData } from "./seed";
import { createClaytonHallSchool, emptySchoolCollections } from "./schools";
import type {
  Acronym,
  AppData,
  AssessmentItem,
  AttendanceRecord,
  BehaviourLog,
  CaptureItem,
  ClassGroup,
  CommsLog,
  ContactEntry,
  GlossaryEntry,
  GoalItem,
  GradeEntry,
  HomeworkItem,
  LessonPlan,
  PdEntry,
  PlannerEvent,
  ProjectItem,
  ReminderPin,
  ResourceLink,
  School,
  SchoolTodo,
  SrsCardProgress,
  Student,
  SupplyItem,
  TaskItem,
  TimetableSlot,
} from "./types";

const LEGACY_STORAGE_KEY = "qts-planner-data";
const ACCOUNT_PREFIX = "teaching-planner-account:";
const LEGACY_ACCOUNT_PREFIX = "qts-planner-personal:";
const CAPTURES_PREFIX = "teaching-planner-captures:";
const LEGACY_CAPTURES_PREFIX = "qts-planner-captures:";

/** Synced to the signed-in account. Never includes captures. */
export type AccountPayload = {
  version: number;
  updatedAt: string;
  tasks: TaskItem[];
  reminders: ReminderPin[];
  srs: Record<string, SrsCardProgress>;
  glossaryNotes: Record<string, string>;
  acronymNotes: Record<string, string>;
  assessmentDone: Record<string, boolean>;
  assessmentNotes: Record<string, string>;
  resourceNotes: Record<string, string>;
  customGlossary: GlossaryEntry[];
  customAcronyms: Acronym[];
  customEvents: PlannerEvent[];
  customAssessments: AssessmentItem[];
  customResources: ResourceLink[];
  schools: School[];
  classes: ClassGroup[];
  students: Student[];
  attendance: AttendanceRecord[];
  grades: GradeEntry[];
  behaviour: BehaviourLog[];
  homework: HomeworkItem[];
  comms: CommsLog[];
  contacts: ContactEntry[];
  schoolTodos: SchoolTodo[];
  goals: GoalItem[];
  pd: PdEntry[];
  supplies: SupplyItem[];
  projects: ProjectItem[];
  timetable: TimetableSlot[];
  lessons: LessonPlan[];
};

function defaultSchools(): School[] {
  return [createClaytonHallSchool()];
}

export function emptyAccount(): AccountPayload {
  const seed = createSeedData();
  const bits = emptySchoolCollections();
  return {
    version: 2,
    updatedAt: "1970-01-01T00:00:00.000Z",
    tasks: seed.tasks.map((t) => ({ ...t, notes: t.notes ?? "" })),
    reminders: [...seed.reminders],
    srs: {},
    glossaryNotes: {},
    acronymNotes: {},
    assessmentDone: {},
    assessmentNotes: {},
    resourceNotes: {},
    customGlossary: [],
    customAcronyms: [],
    customEvents: [],
    customAssessments: [],
    customResources: [],
    schools: defaultSchools(),
    ...bits,
  };
}

export function accountFromFullDump(
  data: AppData,
  updatedAt?: string,
): AccountPayload {
  const seed = createSeedData();
  const seedGloss = new Set(seed.glossary.map((g) => g.id));
  const seedAcr = new Set(seed.acronyms.map((a) => a.id));
  const seedEvt = new Set(seed.events.map((e) => e.id));
  const seedAssess = new Set(seed.assessments.map((a) => a.id));
  const seedRes = new Set(seed.resources.map((r) => r.id));

  const glossaryNotes: Record<string, string> = {};
  for (const g of data.glossary ?? []) {
    if (seedGloss.has(g.id) && g.notes?.trim()) glossaryNotes[g.id] = g.notes;
  }
  const acronymNotes: Record<string, string> = {};
  for (const a of data.acronyms ?? []) {
    if (seedAcr.has(a.id) && a.notes?.trim()) acronymNotes[a.id] = a.notes;
  }
  const assessmentDone: Record<string, boolean> = {};
  const assessmentNotes: Record<string, string> = {};
  for (const a of data.assessments ?? []) {
    if (!seedAssess.has(a.id)) continue;
    if (a.done) assessmentDone[a.id] = true;
    if (a.notes?.trim()) assessmentNotes[a.id] = a.notes;
  }
  const resourceNotes: Record<string, string> = {};
  for (const r of data.resources ?? []) {
    if (seedRes.has(r.id) && r.notes?.trim()) resourceNotes[r.id] = r.notes;
  }

  return {
    version: 2,
    updatedAt: updatedAt || new Date().toISOString(),
    tasks: (data.tasks ?? []).map((t) => ({ ...t, notes: t.notes ?? "" })),
    reminders: data.reminders ?? [],
    srs: data.srs ?? {},
    glossaryNotes,
    acronymNotes,
    assessmentDone,
    assessmentNotes,
    resourceNotes,
    customGlossary: (data.glossary ?? []).filter((g) => !seedGloss.has(g.id)),
    customAcronyms: (data.acronyms ?? []).filter((a) => !seedAcr.has(a.id)),
    customEvents: (data.events ?? []).filter((e) => !seedEvt.has(e.id)),
    customAssessments: (data.assessments ?? []).filter(
      (a) => !seedAssess.has(a.id),
    ),
    customResources: (data.resources ?? []).filter((r) => !seedRes.has(r.id)),
    schools: data.schools?.length ? data.schools : defaultSchools(),
    classes: data.classes ?? [],
    students: data.students ?? [],
    attendance: data.attendance ?? [],
    grades: data.grades ?? [],
    behaviour: data.behaviour ?? [],
    homework: data.homework ?? [],
    comms: data.comms ?? [],
    contacts: data.contacts ?? [],
    schoolTodos: data.schoolTodos ?? [],
    goals: data.goals ?? [],
    pd: data.pd ?? [],
    supplies: data.supplies ?? [],
    projects: data.projects ?? [],
    timetable: data.timetable ?? [],
    lessons: data.lessons ?? [],
  };
}

export function scoreAccount(p: AccountPayload): number {
  return (
    p.tasks.length +
    p.reminders.length +
    Object.keys(p.srs).length +
    Object.keys(p.glossaryNotes).length +
    Object.keys(p.assessmentDone).length +
    p.customGlossary.length +
    p.customEvents.length +
    p.customAssessments.length +
    p.schools.length +
    p.students.length +
    p.lessons.length
  );
}

export function accountFingerprint(p: AccountPayload): string {
  const { updatedAt: _updatedAt, ...rest } = p;
  return JSON.stringify(rest);
}

export function asSafeAccount(
  raw: unknown,
  fallbackUpdatedAt?: string,
): AccountPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<AccountPayload> & Partial<AppData>;
  if (Array.isArray(parsed.tasks)) {
    const account = asAccount(parsed);
    if (fallbackUpdatedAt && account.updatedAt.startsWith("1970-")) {
      return { ...account, updatedAt: fallbackUpdatedAt };
    }
    return account;
  }
  if (parsed.seedVersion || parsed.glossary || parsed.events) {
    return accountFromFullDump(parsed as AppData, parsed.updatedAt || fallbackUpdatedAt);
  }
  return null;
}

function asAccount(parsed: Partial<AccountPayload> & Partial<AppData>): AccountPayload {
  const bits = emptySchoolCollections();
  return {
    version: 2,
    updatedAt: parsed.updatedAt || "1970-01-01T00:00:00.000Z",
    tasks: parsed.tasks ?? [],
    reminders: parsed.reminders ?? [],
    srs: parsed.srs ?? {},
    glossaryNotes: parsed.glossaryNotes ?? {},
    acronymNotes: parsed.acronymNotes ?? {},
    assessmentDone: parsed.assessmentDone ?? {},
    assessmentNotes: parsed.assessmentNotes ?? {},
    resourceNotes: parsed.resourceNotes ?? {},
    customGlossary: parsed.customGlossary ?? [],
    customAcronyms: parsed.customAcronyms ?? [],
    customEvents: parsed.customEvents ?? [],
    customAssessments: parsed.customAssessments ?? [],
    customResources: parsed.customResources ?? [],
    schools: parsed.schools?.length ? parsed.schools : defaultSchools(),
    classes: parsed.classes ?? bits.classes,
    students: parsed.students ?? bits.students,
    attendance: parsed.attendance ?? bits.attendance,
    grades: parsed.grades ?? bits.grades,
    behaviour: parsed.behaviour ?? bits.behaviour,
    homework: parsed.homework ?? bits.homework,
    comms: parsed.comms ?? bits.comms,
    contacts: parsed.contacts ?? bits.contacts,
    schoolTodos: parsed.schoolTodos ?? bits.schoolTodos,
    goals: parsed.goals ?? bits.goals,
    pd: parsed.pd ?? bits.pd,
    supplies: parsed.supplies ?? bits.supplies,
    projects: parsed.projects ?? bits.projects,
    timetable: parsed.timetable ?? bits.timetable,
    lessons: parsed.lessons ?? bits.lessons,
  };
}

function parseMaybeAccount(raw: string): AccountPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AccountPayload> & Partial<AppData>;
    if (parsed.version && Array.isArray(parsed.tasks)) {
      return asAccount(parsed);
    }
    if (parsed.seedVersion || parsed.glossary || parsed.events) {
      return accountFromFullDump(parsed as AppData, parsed.updatedAt);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function parseCaptures(raw: string): CaptureItem[] | null {
  try {
    const parsed = JSON.parse(raw) as {
      captures?: CaptureItem[];
    };
    if (Array.isArray(parsed.captures)) return parsed.captures;
  } catch {
    /* ignore */
  }
  return null;
}

function readFirstAccount(keys: string[]): AccountPayload | null {
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const p = parseMaybeAccount(raw);
    if (p) return p;
  }
  return null;
}

/** Richest account blob still on this device (migration / offline cache). */
export function recoverAccount(userId: string): AccountPayload {
  const candidates: AccountPayload[] = [];
  const accountKeys = [
    `${ACCOUNT_PREFIX}${userId}`,
    `${LEGACY_ACCOUNT_PREFIX}${userId}`,
  ];

  for (const accountKey of accountKeys) {
    const own = localStorage.getItem(accountKey);
    if (own) {
      const p = parseMaybeAccount(own);
      if (p) candidates.push(p);
    }
  }

  const userFull = localStorage.getItem(`${LEGACY_STORAGE_KEY}:${userId}`);
  if (userFull) {
    const p = parseMaybeAccount(userFull);
    if (p) candidates.push(p);
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    const p = parseMaybeAccount(legacy);
    if (p) candidates.push(p);
  }

  const ownScore = candidates.reduce((m, p) => Math.max(m, scoreAccount(p)), 0);
  if (ownScore === 0) {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        !k.startsWith(`${LEGACY_STORAGE_KEY}:`) &&
        !k.startsWith(ACCOUNT_PREFIX) &&
        !k.startsWith(LEGACY_ACCOUNT_PREFIX)
      ) {
        continue;
      }
      if (accountKeys.includes(k) || k.endsWith(`:${userId}`)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const p = parseMaybeAccount(raw);
      if (p) candidates.push(p);
    }
  }

  if (candidates.length === 0) {
    const migrated = readFirstAccount(accountKeys);
    return migrated ?? emptyAccount();
  }
  candidates.sort((a, b) => scoreAccount(b) - scoreAccount(a));
  return candidates[0]!;
}

/** Captures for this account on this browser only — never reclaimed from others. */
export function recoverCaptures(userId: string): CaptureItem[] {
  const keys = [
    `${CAPTURES_PREFIX}${userId}`,
    `${LEGACY_CAPTURES_PREFIX}${userId}`,
  ];
  for (const captureKey of keys) {
    const dedicated = localStorage.getItem(captureKey);
    if (dedicated) {
      const list = parseCaptures(dedicated);
      if (list) return list;
    }
  }

  const ownPersonal = localStorage.getItem(`${ACCOUNT_PREFIX}${userId}`)
    ?? localStorage.getItem(`${LEGACY_ACCOUNT_PREFIX}${userId}`);
  if (ownPersonal) {
    const list = parseCaptures(ownPersonal);
    if (list?.length) return list;
  }

  const userFull = localStorage.getItem(`${LEGACY_STORAGE_KEY}:${userId}`);
  if (userFull) {
    const list = parseCaptures(userFull);
    if (list?.length) return list;
  }

  return [];
}

export function composeAppData(
  account: AccountPayload,
  captures: CaptureItem[],
): AppData {
  const shared = createSeedData();
  return {
    seedVersion: shared.seedVersion,
    acronyms: [
      ...shared.acronyms.map((a) => ({
        ...a,
        notes: account.acronymNotes[a.id] ?? "",
      })),
      ...account.customAcronyms,
    ],
    glossary: [
      ...shared.glossary.map((g) => ({
        ...g,
        notes: account.glossaryNotes[g.id] ?? "",
      })),
      ...account.customGlossary,
    ],
    events: [...shared.events, ...account.customEvents].sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
    ),
    assessments: [
      ...shared.assessments.map((a) => ({
        ...a,
        done: account.assessmentDone[a.id] ?? false,
        notes: account.assessmentNotes[a.id] ?? "",
      })),
      ...account.customAssessments,
    ].sort((a, b) => a.date.localeCompare(b.date)),
    tasks: account.tasks,
    resources: [
      ...shared.resources.map((r) => ({
        ...r,
        notes: account.resourceNotes[r.id] ?? "",
      })),
      ...account.customResources,
    ],
    reminders: account.reminders,
    captures,
    srs: account.srs,
    schools: account.schools?.length ? account.schools : defaultSchools(),
    classes: account.classes ?? [],
    students: account.students ?? [],
    attendance: account.attendance ?? [],
    grades: account.grades ?? [],
    behaviour: account.behaviour ?? [],
    homework: account.homework ?? [],
    comms: account.comms ?? [],
    contacts: account.contacts ?? [],
    schoolTodos: account.schoolTodos ?? [],
    goals: account.goals ?? [],
    pd: account.pd ?? [],
    supplies: account.supplies ?? [],
    projects: account.projects ?? [],
    timetable: account.timetable ?? [],
    lessons: account.lessons ?? [],
  };
}

export function extractAccount(data: AppData, updatedAt: string): AccountPayload {
  return accountFromFullDump(data, updatedAt);
}

export function saveAccountLocal(userId: string, account: AccountPayload) {
  localStorage.setItem(`${ACCOUNT_PREFIX}${userId}`, JSON.stringify(account));
}

export function saveCapturesLocal(userId: string, captures: CaptureItem[]) {
  localStorage.setItem(
    `${CAPTURES_PREFIX}${userId}`,
    JSON.stringify({ captures }),
  );
}

export function loadAppData(userId: string): {
  data: AppData;
  account: AccountPayload;
} {
  const account = recoverAccount(userId);
  const captures = recoverCaptures(userId);
  const data = composeAppData(account, captures);
  saveAccountLocal(userId, account);
  saveCapturesLocal(userId, captures);
  return { data, account };
}
