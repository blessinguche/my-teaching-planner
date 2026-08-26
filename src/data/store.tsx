import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSeedData, SEED_VERSION } from "./seed";
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
  SrsRating,
  TaskItem,
} from "./types";

const STORAGE_KEY = "qts-planner-data";

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalize(data: AppData): AppData {
  return {
    ...data,
    srs: data.srs ?? {},
    assessments: (data.assessments ?? []).map((a) => ({
      ...a,
      notes: a.notes ?? "",
    })),
    tasks: (data.tasks ?? []).map((t) => ({
      ...t,
      notes: t.notes ?? "",
    })),
    glossary: (data.glossary ?? []).map((g) => ({
      ...g,
      notes: g.notes ?? "",
    })),
    acronyms: (data.acronyms ?? []).map((a) => ({
      ...a,
      notes: a.notes ?? "",
    })),
    resources: (data.resources ?? []).map((r) => ({
      ...r,
      notes: r.notes ?? "",
    })),
    captures: data.captures ?? [],
  };
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedData();
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.seedVersion || parsed.seedVersion < SEED_VERSION) {
      return createSeedData();
    }
    return normalize(parsed);
  } catch {
    return createSeedData();
  }
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
  ) => void;
  updateCapture: (id: string, patchData: Partial<CaptureItem>) => void;
  deleteCapture: (id: string) => Promise<void>;
  resetSeed: () => void;
};

const StoreContext = createContext<StoreApi | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => {
    const initial = loadData();
    saveData(initial);
    return initial;
  });

  const patch = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

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
      const item: CaptureItem = {
        ...input,
        id: uid("cap"),
        createdAt: stamp,
        updatedAt: stamp,
      };
      patch((prev) => ({ ...prev, captures: [item, ...prev.captures] }));
    },
    [patch],
  );

  const updateCapture = useCallback(
    (id: string, patchData: Partial<CaptureItem>) => {
      patch((prev) => ({
        ...prev,
        captures: prev.captures.map((c) =>
          c.id === id ? { ...c, ...patchData, updatedAt: nowIso() } : c,
        ),
      }));
    },
    [patch],
  );

  const deleteCapture = useCallback(
    async (id: string) => {
      let audioFileId: string | undefined;
      patch((prev) => {
        const existing = prev.captures.find((c) => c.id === id);
        audioFileId = existing?.audioFileId;
        return {
          ...prev,
          captures: prev.captures.filter((c) => c.id !== id),
        };
      });
      if (audioFileId) {
        try {
          await deleteStoredFile(audioFileId);
        } catch {
          /* best-effort */
        }
      }
    },
    [patch],
  );

  const resetSeed = useCallback(() => {
    const fresh = createSeedData();
    saveData(fresh);
    setData(fresh);
  }, []);

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
      deleteCapture,
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
      deleteCapture,
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
