export type Acronym = {
  id: string;
  acronym: string;
  meaning: string;
  notes?: string;
};

export type GlossaryExample = {
  id: string;
  text: string;
  kind: "practice" | "placement" | "source";
};

export type GlossaryEntry = {
  id: string;
  term: string;
  definition: string;
  whyItMatters: string;
  inPractice: string[];
  examples: GlossaryExample[];
  related: string[];
  source: string;
  tags: string[];
  notes?: string;
};

export type EventKind = "itap" | "meeting" | "deadline" | "personal";
export type EventTrack = "all" | "ft" | "pt" | "extension";

export type PlannerEvent = {
  id: string;
  date: string;
  endDate?: string;
  start: string;
  end: string;
  title: string;
  detail?: string;
  kind: EventKind;
  module?: string;
  track?: EventTrack;
  isAssessment?: boolean;
  link?: string;
};

export type AssessmentPriority = "critical" | "high" | "medium";

export type AssessmentItem = {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  type: string;
  description: string;
  who: string;
  priority: AssessmentPriority;
  track: EventTrack;
  done: boolean;
  notes?: string;
};

export type TaskItem = {
  id: string;
  label: string;
  done: boolean;
  dueDate?: string;
  notes?: string;
};

/** Uploaded file metadata (blob lives in IndexedDB / later cloud storage). */
export type ResourceFileRef = {
  id: string;
  name: string;
  mime: string;
  size: number;
};

export type ResourceLink = {
  id: string;
  name: string;
  url?: string;
  /** @deprecated Prefer uploading a file — kept for older seeded paths only */
  localPath?: string;
  file?: ResourceFileRef;
  category: "qts" | "computing" | "reading" | "other";
  description: string;
  relatedTopics: string[];
  notes?: string;
};

export type ReminderPin = {
  id: string;
  text: string;
};

export type CaptureKind = "note" | "recording";

export type CaptureItem = {
  id: string;
  kind: CaptureKind;
  title: string;
  body: string;
  context?: string;
  permissionConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
  transcript?: string;
  /** IndexedDB / vault id for kept recording audio */
  audioFileId?: string;
};

/** SM-2 style ratings: Again / Hard / Good / Easy */
export type SrsRating = 1 | 2 | 3 | 4;

export type SrsCardProgress = {
  ease: number;
  interval: number;
  repetitions: number;
  due: string;
  lastReviewed?: string;
};

export type ReviewMode =
  | "define"
  | "why"
  | "practice"
  | "acronym-expand"
  | "acronym-recall";

export type ReviewCard = {
  id: string;
  mode: ReviewMode;
  prompt: string;
  answer: string;
  label: string;
};

export type AppData = {
  seedVersion: number;
  acronyms: Acronym[];
  glossary: GlossaryEntry[];
  events: PlannerEvent[];
  assessments: AssessmentItem[];
  tasks: TaskItem[];
  resources: ResourceLink[];
  reminders: ReminderPin[];
  captures: CaptureItem[];
  srs: Record<string, SrsCardProgress>;
};
