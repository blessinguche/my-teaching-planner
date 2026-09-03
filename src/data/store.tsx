import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchAccountCloud,
  pushAccountCloud,
  type CloudFetch,
  type SyncStatus,
} from "./accountSync";
import { deleteStoredFile } from "./fileStore";
import {
  accountFingerprint,
  composeAppData,
  emptyAccount,
  extractAccount,
  loadAppData,
  saveAccountLocal,
  saveCapturesLocal,
} from "./personal";
import { scheduleAfterReview } from "./srs";
import type {
  Acronym,
  AppData,
  AssessmentItem,
  AttendanceMark,
  AttendanceRecord,
  BehaviourLog,
  CaptureItem,
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
  SrsRating,
  Student,
  SupplyItem,
  TaskItem,
  TimetableSlot,
} from "./types";

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

const CLOUD_SAVE_MS = 700;

type StoreApi = {
  data: AppData;
  syncStatus: SyncStatus;
  syncError: string | null;
  retrySync: () => void;
  toggleTask: (id: string) => void;
  toggleAssessment: (id: string) => void;
  reviewCard: (cardId: string, rating: SrsRating) => void;
  addTask: (input: { label: string; dueDate?: string; notes?: string }) => void;
  updateTask: (id: string, patchData: Partial<TaskItem>) => void;
  deleteTask: (id: string) => void;
  addEvent: (input: Omit<PlannerEvent, "id">) => void;
  addAssessment: (
    input: Omit<AssessmentItem, "id" | "done"> & { done?: boolean },
  ) => void;
  updateAssessment: (id: string, patchData: Partial<AssessmentItem>) => void;
  deleteAssessment: (id: string) => void;
  addAcronym: (input: { acronym: string; meaning: string; notes?: string }) => void;
  updateAcronym: (id: string, patchData: Partial<Acronym>) => void;
  deleteAcronym: (id: string) => void;
  addGlossary: (input: {
    term: string;
    definition: string;
    whyItMatters?: string;
    inPractice?: string;
    source?: string;
    notes?: string;
  }) => void;
  updateGlossary: (id: string, patchData: Partial<GlossaryEntry>) => void;
  deleteGlossary: (id: string) => void;
  addResource: (input: {
    name: string;
    url?: string;
    localPath?: string;
    file?: ResourceLink["file"];
    category: ResourceLink["category"];
    description?: string;
    notes?: string;
  }) => void;
  updateResource: (id: string, patchData: Partial<ResourceLink>) => void;
  deleteResource: (id: string) => Promise<void>;
  addReminder: (input: { text: string }) => void;
  addCapture: (
    input: Omit<CaptureItem, "id" | "createdAt" | "updatedAt">,
  ) => string;
  updateCapture: (id: string, patchData: Partial<CaptureItem>) => void;
  resetSeed: () => void;
  addSchool: (
    input: Omit<School, "id" | "createdAt"> & { id?: string },
  ) => string;
  addStudent: (input: Omit<Student, "id">) => void;
  addLesson: (input: Omit<LessonPlan, "id">) => void;
  addTimetableSlot: (input: Omit<TimetableSlot, "id">) => void;
  addHomework: (input: Omit<HomeworkItem, "id" | "done">) => void;
  toggleHomework: (id: string) => void;
  addComms: (input: Omit<CommsLog, "id">) => void;
  addContact: (input: Omit<ContactEntry, "id">) => void;
  addSchoolTodo: (input: Omit<SchoolTodo, "id" | "done">) => void;
  toggleSchoolTodo: (id: string) => void;
  addGoal: (input: Omit<GoalItem, "id" | "done">) => void;
  addPd: (input: Omit<PdEntry, "id">) => void;
  addSupply: (input: Omit<SupplyItem, "id">) => void;
  addProject: (input: Omit<ProjectItem, "id">) => void;
  addBehaviour: (input: Omit<BehaviourLog, "id">) => void;
  addGrade: (input: Omit<GradeEntry, "id">) => void;
  upsertAttendance: (input: {
    schoolId: string;
    studentId: string;
    date: string;
    mark: AttendanceMark;
    notes?: string;
  }) => void;
};

const StoreContext = createContext<StoreApi | null>(null);

function applyFetchStatus(
  result: CloudFetch,
): { status: SyncStatus; error: string | null } {
  if (result.kind === "missing-table") {
    return { status: "setup", error: null };
  }
  if (result.kind === "error") {
    return { status: "offline", error: result.message };
  }
  return { status: "synced", error: null };
}

export function DataProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const initial = useMemo(() => loadAppData(userId), [userId]);
  const [data, setData] = useState<AppData>(initial.data);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("syncing");
  const [syncError, setSyncError] = useState<string | null>(null);

  const dataRef = useRef(initial.data);
  const updatedAtRef = useRef(initial.account.updatedAt);
  const hydratingRef = useRef(true);
  const dirtyAccountRef = useRef(false);
  const syncStatusRef = useRef<SyncStatus>("syncing");
  const saveTimerRef = useRef<number | null>(null);
  dataRef.current = data;
  syncStatusRef.current = syncStatus;

  const persistLocal = useCallback(
    (next: AppData, updatedAt: string) => {
      saveAccountLocal(userId, extractAccount(next, updatedAt));
      saveCapturesLocal(userId, next.captures);
    },
    [userId],
  );

  const pushCloudNow = useCallback(async () => {
    if (syncStatusRef.current === "setup") return;
    const account = extractAccount(dataRef.current, updatedAtRef.current);
    setSyncStatus("syncing");
    const result = await pushAccountCloud(userId, account);
    const applied = applyFetchStatus(result);
    setSyncStatus(applied.status);
    setSyncError(applied.error);
    if (result.kind === "ok") dirtyAccountRef.current = false;
  }, [userId]);

  const scheduleCloudPush = useCallback(() => {
    if (hydratingRef.current) return;
    if (syncStatusRef.current === "setup") return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void pushCloudNow();
    }, CLOUD_SAVE_MS);
  }, [pushCloudNow]);

  const patch = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const next = updater(prev);
        persistLocal(next, updatedAtRef.current);
        const changed =
          accountFingerprint(extractAccount(prev, updatedAtRef.current)) !==
          accountFingerprint(extractAccount(next, updatedAtRef.current));
        if (changed) {
          updatedAtRef.current = nowIso();
          persistLocal(next, updatedAtRef.current);
          dirtyAccountRef.current = true;
          scheduleCloudPush();
        }
        return next;
      });
    },
    [persistLocal, scheduleCloudPush],
  );

  const hydrateFromCloud = useCallback(async () => {
    hydratingRef.current = true;
    setSyncStatus("syncing");
    const result = await fetchAccountCloud(userId);
    if (result.kind !== "ok") {
      const applied = applyFetchStatus(result);
      setSyncStatus(applied.status);
      setSyncError(applied.error);
      hydratingRef.current = false;
      return;
    }

    if (dirtyAccountRef.current) {
      hydratingRef.current = false;
      await pushCloudNow();
      return;
    }

    const cloud = result.payload;
    const local = extractAccount(dataRef.current, updatedAtRef.current);
    if (!cloud) {
      if (local.updatedAt.startsWith("1970-")) {
        updatedAtRef.current = nowIso();
        persistLocal(dataRef.current, updatedAtRef.current);
      }
      hydratingRef.current = false;
      await pushCloudNow();
      return;
    }

    const cloudTime = Date.parse(cloud.updatedAt) || 0;
    const localTime = Date.parse(local.updatedAt) || 0;
    if (cloudTime > localTime) {
      const next = composeAppData(cloud, dataRef.current.captures);
      updatedAtRef.current = cloud.updatedAt;
      persistLocal(next, cloud.updatedAt);
      setData(next);
      hydratingRef.current = false;
      setSyncStatus("synced");
      setSyncError(null);
      return;
    }

    hydratingRef.current = false;
    if (localTime > cloudTime) {
      await pushCloudNow();
      return;
    }
    setSyncStatus("synced");
    setSyncError(null);
  }, [persistLocal, pushCloudNow, userId]);

  useEffect(() => {
    void hydrateFromCloud();
    const onFocus = () => {
      if (hydratingRef.current) return;
      if (dirtyAccountRef.current) {
        void pushCloudNow();
        return;
      }
      void hydrateFromCloud();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [hydrateFromCloud, pushCloudNow]);

  const retrySync = useCallback(() => {
    dirtyAccountRef.current = true;
    void hydrateFromCloud();
  }, [hydrateFromCloud]);

  const toggleTask = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === id ? { ...t, done: !t.done } : t,
        ),
      }));
    },
    [patch],
  );

  const toggleAssessment = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        assessments: prev.assessments.map((a) =>
          a.id === id ? { ...a, done: !a.done } : a,
        ),
      }));
    },
    [patch],
  );

  const reviewCard = useCallback(
    (cardId: string, rating: SrsRating) => {
      patch((prev) => ({
        ...prev,
        srs: {
          ...prev.srs,
          [cardId]: scheduleAfterReview(prev.srs[cardId], rating),
        },
      }));
    },
    [patch],
  );

  const addTask = useCallback(
    (input: { label: string; dueDate?: string; notes?: string }) => {
      const task: TaskItem = {
        id: uid("task"),
        label: input.label,
        done: false,
        dueDate: input.dueDate || undefined,
        notes: input.notes || "",
      };
      patch((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }));
    },
    [patch],
  );

  const updateTask = useCallback(
    (id: string, patchData: Partial<TaskItem>) => {
      patch((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...patchData } : t)),
      }));
    },
    [patch],
  );

  const deleteTask = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
      }));
    },
    [patch],
  );

  const addEvent = useCallback(
    (input: Omit<PlannerEvent, "id">) => {
      const event: PlannerEvent = { ...input, id: uid("evt") };
      patch((prev) => ({
        ...prev,
        events: [...prev.events, event].sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
        ),
      }));
    },
    [patch],
  );

  const addAssessment = useCallback(
    (input: Omit<AssessmentItem, "id" | "done"> & { done?: boolean }) => {
      const item: AssessmentItem = {
        ...input,
        id: uid("assess"),
        done: input.done ?? false,
        notes: input.notes ?? "",
      };
      patch((prev) => ({
        ...prev,
        assessments: [...prev.assessments, item].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      }));
    },
    [patch],
  );

  const updateAssessment = useCallback(
    (id: string, patchData: Partial<AssessmentItem>) => {
      patch((prev) => ({
        ...prev,
        assessments: prev.assessments.map((a) =>
          a.id === id ? { ...a, ...patchData } : a,
        ),
      }));
    },
    [patch],
  );

  const deleteAssessment = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        assessments: prev.assessments.filter((a) => a.id !== id),
      }));
    },
    [patch],
  );

  const addAcronym = useCallback(
    (input: { acronym: string; meaning: string; notes?: string }) => {
      const item: Acronym = {
        id: uid("acr"),
        acronym: input.acronym.toUpperCase(),
        meaning: input.meaning,
        notes: input.notes || "",
      };
      patch((prev) => ({
        ...prev,
        acronyms: [...prev.acronyms, item].sort((a, b) =>
          a.acronym.localeCompare(b.acronym),
        ),
      }));
    },
    [patch],
  );

  const updateAcronym = useCallback(
    (id: string, patchData: Partial<Acronym>) => {
      patch((prev) => ({
        ...prev,
        acronyms: prev.acronyms.map((a) =>
          a.id === id ? { ...a, ...patchData } : a,
        ),
      }));
    },
    [patch],
  );

  const deleteAcronym = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        acronyms: prev.acronyms.filter((a) => a.id !== id),
      }));
    },
    [patch],
  );

  const addGlossary = useCallback(
    (input: {
      term: string;
      definition: string;
      whyItMatters?: string;
      inPractice?: string;
      source?: string;
      notes?: string;
    }) => {
      const entry: GlossaryEntry = {
        id: uid("gloss"),
        term: input.term,
        definition: input.definition,
        whyItMatters: input.whyItMatters || "Add why this matters.",
        inPractice: input.inPractice
          ? input.inPractice
              .split(/\n|;/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        examples: [],
        related: [],
        source: input.source?.trim() || "Added by you",
        tags: ["custom"],
        notes: input.notes || "",
      };
      patch((prev) => ({ ...prev, glossary: [entry, ...prev.glossary] }));
    },
    [patch],
  );

  const updateGlossary = useCallback(
    (id: string, patchData: Partial<GlossaryEntry>) => {
      patch((prev) => ({
        ...prev,
        glossary: prev.glossary.map((g) =>
          g.id === id ? { ...g, ...patchData } : g,
        ),
      }));
    },
    [patch],
  );

  const deleteGlossary = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        glossary: prev.glossary.filter((g) => g.id !== id),
      }));
    },
    [patch],
  );

  const addResource = useCallback(
    (input: {
      name: string;
      url?: string;
      localPath?: string;
      file?: ResourceLink["file"];
      category: ResourceLink["category"];
      description?: string;
      notes?: string;
    }) => {
      const item: ResourceLink = {
        id: uid("res"),
        name: input.name,
        url: input.url || undefined,
        localPath: input.localPath || undefined,
        file: input.file,
        category: input.category,
        description: input.description || "",
        relatedTopics: [],
        notes: input.notes || "",
      };
      patch((prev) => ({ ...prev, resources: [item, ...prev.resources] }));
    },
    [patch],
  );

  const updateResource = useCallback(
    (id: string, patchData: Partial<ResourceLink>) => {
      patch((prev) => ({
        ...prev,
        resources: prev.resources.map((r) =>
          r.id === id ? { ...r, ...patchData } : r,
        ),
      }));
    },
    [patch],
  );

  const deleteResource = useCallback(
    async (id: string) => {
      let fileId: string | undefined;
      patch((prev) => {
        const existing = prev.resources.find((r) => r.id === id);
        fileId = existing?.file?.id;
        return {
          ...prev,
          resources: prev.resources.filter((r) => r.id !== id),
        };
      });
      if (fileId) {
        try {
          await deleteStoredFile(fileId);
        } catch {
          // Metadata already removed; vault cleanup best-effort
        }
      }
    },
    [patch],
  );

  const addReminder = useCallback(
    (input: { text: string }) => {
      const item: ReminderPin = { id: uid("rem"), text: input.text };
      patch((prev) => ({ ...prev, reminders: [item, ...prev.reminders] }));
    },
    [patch],
  );

  const addCapture = useCallback(
    (input: Omit<CaptureItem, "id" | "createdAt" | "updatedAt">) => {
      const stamp = nowIso();
      const id = uid("cap");
      const item: CaptureItem = {
        ...input,
        id,
        createdAt: stamp,
        updatedAt: stamp,
      };
      patch((prev) => ({ ...prev, captures: [item, ...prev.captures] }));
      return id;
    },
    [patch],
  );

  const updateCapture = useCallback(
    (id: string, patchData: Partial<CaptureItem>) => {
      const cleaned = Object.fromEntries(
        Object.entries(patchData).filter(([, v]) => v !== undefined),
      ) as Partial<CaptureItem>;
      patch((prev) => ({
        ...prev,
        captures: prev.captures.map((c) =>
          c.id === id ? { ...c, ...cleaned, updatedAt: nowIso() } : c,
        ),
      }));
    },
    [patch],
  );

  const resetSeed = useCallback(() => {
    const account = { ...emptyAccount(), updatedAt: nowIso() };
    const next = composeAppData(account, dataRef.current.captures);
    updatedAtRef.current = account.updatedAt;
    persistLocal(next, account.updatedAt);
    setData(next);
    dirtyAccountRef.current = true;
    scheduleCloudPush();
  }, [persistLocal, scheduleCloudPush]);

  const addSchool = useCallback(
    (input: Omit<School, "id" | "createdAt"> & { id?: string }) => {
      const id = input.id ?? uid("school");
      const school: School = {
        ...input,
        id,
        createdAt: nowIso(),
      };
      patch((prev) => ({ ...prev, schools: [...prev.schools, school] }));
      return id;
    },
    [patch],
  );

  const addStudent = useCallback(
    (input: Omit<Student, "id">) => {
      patch((prev) => ({
        ...prev,
        students: [...prev.students, { ...input, id: uid("stu") }],
      }));
    },
    [patch],
  );

  const addLesson = useCallback(
    (input: Omit<LessonPlan, "id">) => {
      patch((prev) => ({
        ...prev,
        lessons: [...prev.lessons, { ...input, id: uid("lesson") }],
      }));
    },
    [patch],
  );

  const addTimetableSlot = useCallback(
    (input: Omit<TimetableSlot, "id">) => {
      patch((prev) => ({
        ...prev,
        timetable: [...prev.timetable, { ...input, id: uid("tt") }],
      }));
    },
    [patch],
  );

  const addHomework = useCallback(
    (input: Omit<HomeworkItem, "id" | "done">) => {
      patch((prev) => ({
        ...prev,
        homework: [
          { ...input, id: uid("hw"), done: false },
          ...prev.homework,
        ],
      }));
    },
    [patch],
  );

  const toggleHomework = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        homework: prev.homework.map((h) =>
          h.id === id ? { ...h, done: !h.done } : h,
        ),
      }));
    },
    [patch],
  );

  const addComms = useCallback(
    (input: Omit<CommsLog, "id">) => {
      patch((prev) => ({
        ...prev,
        comms: [{ ...input, id: uid("comms") }, ...prev.comms],
      }));
    },
    [patch],
  );

  const addContact = useCallback(
    (input: Omit<ContactEntry, "id">) => {
      patch((prev) => ({
        ...prev,
        contacts: [...prev.contacts, { ...input, id: uid("contact") }],
      }));
    },
    [patch],
  );

  const addSchoolTodo = useCallback(
    (input: Omit<SchoolTodo, "id" | "done">) => {
      patch((prev) => ({
        ...prev,
        schoolTodos: [
          { ...input, id: uid("stodo"), done: false },
          ...prev.schoolTodos,
        ],
      }));
    },
    [patch],
  );

  const toggleSchoolTodo = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        schoolTodos: prev.schoolTodos.map((t) =>
          t.id === id ? { ...t, done: !t.done } : t,
        ),
      }));
    },
    [patch],
  );

  const addGoal = useCallback(
    (input: Omit<GoalItem, "id" | "done">) => {
      patch((prev) => ({
        ...prev,
        goals: [{ ...input, id: uid("goal"), done: false }, ...prev.goals],
      }));
    },
    [patch],
  );

  const addPd = useCallback(
    (input: Omit<PdEntry, "id">) => {
      patch((prev) => ({
        ...prev,
        pd: [{ ...input, id: uid("pd") }, ...prev.pd],
      }));
    },
    [patch],
  );

  const addSupply = useCallback(
    (input: Omit<SupplyItem, "id">) => {
      patch((prev) => ({
        ...prev,
        supplies: [...prev.supplies, { ...input, id: uid("supply") }],
      }));
    },
    [patch],
  );

  const addProject = useCallback(
    (input: Omit<ProjectItem, "id">) => {
      patch((prev) => ({
        ...prev,
        projects: [...prev.projects, { ...input, id: uid("proj") }],
      }));
    },
    [patch],
  );

  const addBehaviour = useCallback(
    (input: Omit<BehaviourLog, "id">) => {
      patch((prev) => ({
        ...prev,
        behaviour: [{ ...input, id: uid("beh") }, ...prev.behaviour],
      }));
    },
    [patch],
  );

  const addGrade = useCallback(
    (input: Omit<GradeEntry, "id">) => {
      patch((prev) => ({
        ...prev,
        grades: [{ ...input, id: uid("grade") }, ...prev.grades],
      }));
    },
    [patch],
  );

  const upsertAttendance = useCallback(
    (input: {
      schoolId: string;
      studentId: string;
      date: string;
      mark: AttendanceMark;
      notes?: string;
    }) => {
      patch((prev) => {
        const existing = prev.attendance.find(
          (a) =>
            a.schoolId === input.schoolId &&
            a.studentId === input.studentId &&
            a.date === input.date,
        );
        if (existing) {
          return {
            ...prev,
            attendance: prev.attendance.map((a) =>
              a.id === existing.id
                ? { ...a, mark: input.mark, notes: input.notes }
                : a,
            ),
          };
        }
        const row: AttendanceRecord = {
          id: uid("att"),
          schoolId: input.schoolId,
          studentId: input.studentId,
          date: input.date,
          mark: input.mark,
          notes: input.notes,
        };
        return { ...prev, attendance: [...prev.attendance, row] };
      });
    },
    [patch],
  );

  const value = useMemo(
    () => ({
      data,
      syncStatus,
      syncError,
      retrySync,
      toggleTask,
      toggleAssessment,
      reviewCard,
      addTask,
      updateTask,
      deleteTask,
      addEvent,
      addAssessment,
      updateAssessment,
      deleteAssessment,
      addAcronym,
      updateAcronym,
      deleteAcronym,
      addGlossary,
      updateGlossary,
      deleteGlossary,
      addResource,
      updateResource,
      deleteResource,
      addReminder,
      addCapture,
      updateCapture,
      resetSeed,
      addSchool,
      addStudent,
      addLesson,
      addTimetableSlot,
      addHomework,
      toggleHomework,
      addComms,
      addContact,
      addSchoolTodo,
      toggleSchoolTodo,
      addGoal,
      addPd,
      addSupply,
      addProject,
      addBehaviour,
      addGrade,
      upsertAttendance,
    }),
    [
      data,
      syncStatus,
      syncError,
      retrySync,
      toggleTask,
      toggleAssessment,
      reviewCard,
      addTask,
      updateTask,
      deleteTask,
      addEvent,
      addAssessment,
      updateAssessment,
      deleteAssessment,
      addAcronym,
      updateAcronym,
      deleteAcronym,
      addGlossary,
      updateGlossary,
      deleteGlossary,
      addResource,
      updateResource,
      deleteResource,
      addReminder,
      addCapture,
      updateCapture,
      resetSeed,
      addSchool,
      addStudent,
      addLesson,
      addTimetableSlot,
      addHomework,
      toggleHomework,
      addComms,
      addContact,
      addSchoolTodo,
      toggleSchoolTodo,
      addGoal,
      addPd,
      addSupply,
      addProject,
      addBehaviour,
      addGrade,
      upsertAttendance,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within DataProvider");
  return ctx;
}

export { todayISO, formatShortDate, formatDayHeading, addDays } from "./dates";
export type { SyncStatus } from "./accountSync";
