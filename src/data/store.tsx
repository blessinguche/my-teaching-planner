import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSeedData } from "./seed";
import { deleteStoredFile } from "./fileStore";
import { scheduleAfterReview } from "./srs";
import type {
  Acronym,
  AppData,
  AssessmentItem,
  CaptureItem,
  GlossaryEntry,
  PlannerEvent,
  ReminderPin,
  ResourceLink,
  SrsCardProgress,
  SrsRating,
  TaskItem,
} from "./types";

const LEGACY_STORAGE_KEY = "qts-planner-data";
const PERSONAL_PREFIX = "qts-planner-personal:";

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

/** Per-account only — todos, remember pins, captures, SRS progress, personal notes */
type PersonalData = {
  version: number;
  tasks: TaskItem[];
  reminders: ReminderPin[];
  captures: CaptureItem[];
  srs: Record<string, SrsCardProgress>;
  glossaryNotes: Record<string, string>;
  acronymNotes: Record<string, string>;
  assessmentDone: Record<string, boolean>;
  assessmentNotes: Record<string, string>;
  resourceNotes: Record<string, string>;
  /** User-added items (not in shared programme seed) */
  customGlossary: GlossaryEntry[];
  customAcronyms: Acronym[];
  customEvents: PlannerEvent[];
  customAssessments: AssessmentItem[];
  customResources: ResourceLink[];
};

function emptyPersonal(): PersonalData {
  const seed = createSeedData();
  return {
    version: 1,
    tasks: seed.tasks.map((t) => ({ ...t, notes: t.notes ?? "" })),
    reminders: [...seed.reminders],
    captures: [],
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
  };
}

function personalFromFullDump(data: AppData): PersonalData {
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
    version: 1,
    tasks: (data.tasks ?? []).map((t) => ({ ...t, notes: t.notes ?? "" })),
    reminders: data.reminders ?? [],
    captures: data.captures ?? [],
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
  };
}

function scorePersonal(p: PersonalData): number {
  return (
    p.tasks.length +
    p.reminders.length +
    p.captures.length +
    Object.keys(p.srs).length +
    p.customGlossary.length
  );
}

function parseMaybeFull(raw: string): PersonalData | null {
  try {
    const parsed = JSON.parse(raw) as AppData & Partial<PersonalData>;
    // Already personal-shaped
    if (parsed.version && Array.isArray(parsed.tasks) && parsed.captures) {
      return {
        ...emptyPersonal(),
        ...parsed,
        tasks: parsed.tasks ?? [],
        reminders: parsed.reminders ?? [],
        captures: parsed.captures ?? [],
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
      };
    }
    // Full app dump (legacy / old per-user blob)
    if (parsed.seedVersion || parsed.glossary || parsed.events) {
      return personalFromFullDump(parsed as AppData);
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Recover the richest personal blob still on this device. */
function recoverPersonal(userId: string): PersonalData {
  const candidates: PersonalData[] = [];

  const personalKey = `${PERSONAL_PREFIX}${userId}`;
  const personalRaw = localStorage.getItem(personalKey);
  if (personalRaw) {
    const p = parseMaybeFull(personalRaw);
    if (p) candidates.push(p);
  }

  const userFull = localStorage.getItem(`${LEGACY_STORAGE_KEY}:${userId}`);
  if (userFull) {
    const p = parseMaybeFull(userFull);
    if (p) candidates.push(p);
  }

  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    const p = parseMaybeFull(legacy);
    if (p) candidates.push(p);
  }

  // Other accounts' dumps on this browser (e.g. old Google UUID) — reclaim richest
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k === personalKey || k === LEGACY_STORAGE_KEY) continue;
    if (
      !k.startsWith(`${LEGACY_STORAGE_KEY}:`) &&
      !k.startsWith(PERSONAL_PREFIX)
    ) {
      continue;
    }
    if (k.endsWith(`:${userId}`) || k === `${PERSONAL_PREFIX}${userId}`) continue;
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    const p = parseMaybeFull(raw);
    if (p) candidates.push(p);
  }

  if (candidates.length === 0) return emptyPersonal();
  candidates.sort((a, b) => scorePersonal(b) - scorePersonal(a));
  return candidates[0]!;
}

function composeAppData(personal: PersonalData): AppData {
  const shared = createSeedData();
  return {
    seedVersion: shared.seedVersion,
    acronyms: [
      ...shared.acronyms.map((a) => ({
        ...a,
        notes: personal.acronymNotes[a.id] ?? "",
      })),
      ...personal.customAcronyms,
    ],
    glossary: [
      ...shared.glossary.map((g) => ({
        ...g,
        notes: personal.glossaryNotes[g.id] ?? "",
      })),
      ...personal.customGlossary,
    ],
    events: [...shared.events, ...personal.customEvents].sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
    ),
    assessments: [
      ...shared.assessments.map((a) => ({
        ...a,
        done: personal.assessmentDone[a.id] ?? false,
        notes: personal.assessmentNotes[a.id] ?? "",
      })),
      ...personal.customAssessments,
    ].sort((a, b) => a.date.localeCompare(b.date)),
    tasks: personal.tasks,
    resources: [
      ...shared.resources.map((r) => ({
        ...r,
        notes: personal.resourceNotes[r.id] ?? "",
      })),
      ...personal.customResources,
    ],
    reminders: personal.reminders,
    captures: personal.captures,
    srs: personal.srs,
  };
}

function extractPersonal(data: AppData): PersonalData {
  return personalFromFullDump(data);
}

function savePersonal(userId: string, data: AppData) {
  const personal = extractPersonal(data);
  localStorage.setItem(
    `${PERSONAL_PREFIX}${userId}`,
    JSON.stringify(personal),
  );
}

function loadAppData(userId: string): AppData {
  const personal = recoverPersonal(userId);
  const composed = composeAppData(personal);
  // Persist recovered personal under this account so it sticks
  savePersonal(userId, composed);
  return composed;
}

type StoreApi = {
  data: AppData;
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
};

const StoreContext = createContext<StoreApi | null>(null);

export function DataProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [data, setData] = useState<AppData>(() => loadAppData(userId));

  const patch = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setData((prev) => {
        const next = updater(prev);
        savePersonal(userId, next);
        return next;
      });
    },
    [userId],
  );

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
    const fresh = composeAppData(emptyPersonal());
    savePersonal(userId, fresh);
    setData(fresh);
  }, [userId]);

  const value = useMemo(
    () => ({
      data,
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
    }),
    [
      data,
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
