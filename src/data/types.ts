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
export type EventSource = "qts" | "school" | "personal";

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
  /** External URL or deep link */
  link?: string;
  /** Optional meeting this deadline/event relates to */
  linkedMeetingId?: string;
  schoolId?: string;
  source?: EventSource;
};

export type PeriodKind = "tutor" | "lesson" | "break" | "lunch";

export type PeriodSlot = {
  id: string;
  name: string;
  start: string;
  end: string;
  kind: PeriodKind;
};

export type SchoolTerm = {
  id: string;
  name: string;
  start: string;
  end: string;
};

export type SchoolClosure = {
  id: string;
  label: string;
  start: string;
  end: string;
  kind: "holiday" | "inset" | "bank";
};

export type School = {
  id: string;
  name: string;
  shortName: string;
  academicYear: string;
  periods: PeriodSlot[];
  terms: SchoolTerm[];
  closures: SchoolClosure[];
  startNotes?: string;
  createdAt: string;
};

export type ClassGroup = {
  id: string;
  schoolId: string;
  name: string;
  yearGroup?: string;
  subject?: string;
};

export type Student = {
  id: string;
  schoolId: string;
  classId?: string;
  name: string;
  yearGroup?: string;
  form?: string;
  notes?: string;
  birthday?: string;
  parentContact?: string;
};

export type AttendanceMark = "present" | "absent" | "late" | "authorised";

export type AttendanceRecord = {
  id: string;
  schoolId: string;
  studentId: string;
  date: string;
  mark: AttendanceMark;
  notes?: string;
};

export type GradeEntry = {
  id: string;
  schoolId: string;
  studentId: string;
  title: string;
  score?: string;
  date: string;
  notes?: string;
};

export type BehaviourLog = {
  id: string;
  schoolId: string;
  studentId?: string;
  date: string;
  title: string;
  detail?: string;
  intervention?: string;
};

export type HomeworkItem = {
  id: string;
  schoolId: string;
  classId?: string;
  title: string;
  dueDate: string;
  done: boolean;
  notes?: string;
};

export type CommsLog = {
  id: string;
  schoolId: string;
  contactName: string;
  studentId?: string;
  date: string;
  method: string;
  summary: string;
};

export type ContactEntry = {
  id: string;
  schoolId: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type SchoolTodo = {
  id: string;
  schoolId: string;
  label: string;
  done: boolean;
  dueDate?: string;
};

export type GoalItem = {
  id: string;
  schoolId: string;
  title: string;
  period: string;
  notes?: string;
  done: boolean;
};

export type PdEntry = {
  id: string;
  schoolId: string;
  title: string;
  date: string;
  provider?: string;
  notes?: string;
};

export type SupplyItem = {
  id: string;
  schoolId: string;
  name: string;
  qty?: string;
  notes?: string;
};

export type ProjectItem = {
  id: string;
  schoolId: string;
  title: string;
  start?: string;
  end?: string;
  notes?: string;
  status: "planned" | "active" | "done";
};

export type TimetableSlot = {
  id: string;
  schoolId: string;
  /** 1 = Mon … 5 = Fri */
  day: 1 | 2 | 3 | 4 | 5;
  periodId: string;
  className: string;
  room?: string;
  subject?: string;
};

export type LessonPlan = {
  id: string;
  schoolId: string;
  date: string;
  periodId?: string;
  className?: string;
  title: string;
  objectives?: string;
  notes?: string;
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
