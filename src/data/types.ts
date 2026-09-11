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

export type LessonSequencePhase =
  | "entrance"
  | "introduction"
  | "input"
  | "checkpoint"
  | "plenary"
  | "other";

export type LessonSequenceRow = {
  id: string;
  phase: LessonSequencePhase;
  /** Optional section heading shown above the row (e.g. Entrance / Plenary). */
  heading?: string;
  time: string;
  teacher: string;
  learners: string;
};

/** NIoT ITE lesson plan proforma (Part I overview + Part II sequence). */
export type LessonPlan = {
  id: string;
  schoolId: string;
  /** Part I — overview */
  teacher: string;
  date: string;
  teachingGroup: string;
  title: string;
  objectives: string;
  /** What previous learning to revisit */
  review: string;
  /** Q1 Where are the learners starting from? */
  startingFrom: string;
  /** Q2 Where do I want them to get to? */
  endGoal: string;
  /** Q3 Core knowledge */
  coreKnowledge: string;
  /** Q3 Checkpoint check */
  checkpointCheck: string;
  /** Q4 Likely misconception(s) */
  misconceptions: string;
  /** Q4 How I will find misconceptions */
  findMisconceptions: string;
  /** Q5 Tier 2/3 vocabulary */
  vocabulary: string;
  /** Mentor meeting action step(s) */
  mentorFocus: string;
  /** Part II — lesson sequence rows */
  sequence: LessonSequenceRow[];
};

/** Placement planner — teacher focus / weekly / meetings extras */
export type PlacementProfile = {
  schoolId: string;
  name: string;
  placementSchools: string;
  trainingProvider: string;
  email: string;
  phaseSubject: string;
};

export type LoginEntry = {
  id: string;
  schoolId: string;
  website: string;
  username: string;
  password: string;
};

export type KeyRolesMap = {
  schoolId: string;
  placement: string;
  headteacher: string;
  deputy: string;
  sendco: string;
  dsl: string;
  otherRoles: string;
  myResponsibilities: string;
  otherNotes: string;
};

export type FindEntry = {
  id: string;
  schoolId: string;
  kind: "book" | "app" | "website" | "social";
  title: string;
  description: string;
  rating: string;
  platform?: string;
};

export type TrainingTarget = {
  id: string;
  schoolId: string;
  placement: 1 | 2 | 3;
  slot: 1 | 2 | 3;
  target: string;
  standardsRef: string;
  midProgress: string;
  midActions: string;
  endProgress: string;
  endActions: string;
};

/** Teacher training assignment tracker rows */
export type TrainingAssignment = {
  id: string;
  schoolId: string;
  title: string;
  className: string;
  dueDate: string;
  done: boolean;
  grade: string;
};

export type WeekTodo = {
  id: string;
  label: string;
  done: boolean;
};

export type WeeklyPlan = {
  id: string;
  schoolId: string;
  weekStart: string;
  term: string;
  weekLabel: string;
  cells: Record<string, string>;
  target: string;
  wentWell: string;
  todos: WeekTodo[];
};

export type MeetingNote = {
  id: string;
  schoolId: string;
  kind: "mentor" | "observed" | "observing" | "training" | "others";
  date: string;
  observed: string;
  focus: string;
  subjectYear: string;
  outline: string;
  wentWell: string;
  impact: string;
  develop1: string;
  develop2: string;
  develop3: string;
  body: string;
  /** Mentor sheet — next meeting date */
  nextMeetingDate?: string;
  /** Observation of others — NIoT proforma fields */
  topic?: string;
  focusArea1?: string;
  strategies1?: string;
  outcomes1?: string;
  comments1?: string;
  focusArea2?: string;
  strategies2?: string;
  outcomes2?: string;
  comments2?: string;
};

/** Weekly Trainee Progress Record (NIoT TPR). */
export type TraineeProgressRecord = {
  id: string;
  schoolId: string;
  /** e.g. Term 1: Week 2 following Thu 10th September */
  weekLabel: string;
  date: string;
  /** Linked lesson plan used for Part I / II export */
  lessonPlanId?: string;
  formalLessonPlanReady: string;
  strengthSC: string;
  strengthPT: string;
  strengthKYL: string;
  strengthBR: string;
  strengthMC: string;
  strengthART: string;
  strengthPB: string;
  strengthEC: string;
  keyDevelopmentPoints: string;
  weeklyReviewDrawingUpon: string;
  weeklyReviewFurtherProgress: string;
  wellbeingCheckDone: string;
  centreActionMet: string;
  centreActionEvidence: string;
  mentorActionMet: string;
  mentorActionEvidence: string;
  notMetReasons: string;
  daysAbsent: string;
  absenceReasons: string;
  absenceStart: string;
  absenceEnd: string;
  absenceOther: string;
  trainingConversationNotes: string;
  centreActionStep1: string;
  centreActionStep2: string;
  mentorLedConversationDone: string;
  curriculumTaskDone: string;
};

export type SeatingCell = {
  id: string;
  schoolId: string;
  block: number;
  row: number;
  col: number;
  text: string;
};

export type PlanningResources = {
  schoolId: string;
  planningTime: string;
  staffMeetings: string;
  mentorMeetings: string;
  schemes: string;
  planningAidWebsites: string;
  onlineTools: string;
  staffExpertise: string;
  otherResources: string;
  learningNeeds: string;
};

/** Endless classroom practice notes (dot-grid page) */
export type ClassroomPracticeNote = {
  id: string;
  schoolId: string;
  standardLabel: string;
  body: string;
};

export type ProudPlace = {
  schoolId: string;
  proud: string;
  nextAchieve: string;
};

export type PlacementOverview = {
  schoolId: string;
  term: string;
  notes: string;
  weekHeaders: string[];
  weekCells: Record<string, string>;
};

/** Notes column on the school month calendar (one row per week). */
export type CalendarWeekNote = {
  id: string;
  schoolId: string;
  weekStart: string;
  note: string;
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
  placementProfiles: PlacementProfile[];
  logins: LoginEntry[];
  keyRoles: KeyRolesMap[];
  finds: FindEntry[];
  trainingTargets: TrainingTarget[];
  trainingAssignments: TrainingAssignment[];
  weeklyPlans: WeeklyPlan[];
  meetingNotes: MeetingNote[];
  seating: SeatingCell[];
  planningResources: PlanningResources[];
  proudPlaces: ProudPlace[];
  placementOverviews: PlacementOverview[];
  calendarWeekNotes: CalendarWeekNote[];
  classroomPracticeNotes: ClassroomPracticeNote[];
  traineeProgressRecords: TraineeProgressRecord[];
};
