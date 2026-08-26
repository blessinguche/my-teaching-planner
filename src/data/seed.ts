import type { AppData } from "./types";
import { KEY_ASSESSMENTS, PROGRAMME_EVENTS } from "./programmeCalendar";
import { HOLIDAY_BREAKS } from "./breaks";

/** Seed v4 — handout todos, Ormiston breaks, calendar-ready */
export const SEED_VERSION = 4;

const acronyms: AppData["acronyms"] = [
  { id: "afl", acronym: "AFL", meaning: "Assessment For Learning" },
  { id: "aht", acronym: "AHT", meaning: "Assistant Headteacher" },
  { id: "app", acronym: "APP", meaning: "Assessing Pupil Progress" },
  { id: "asp", acronym: "ASP", meaning: "Analyse School Performance" },
  { id: "bda", acronym: "BDA", meaning: "British Dyslexia Association" },
  { id: "bfl", acronym: "BFL", meaning: "Behaviour For Learning" },
  { id: "bge", acronym: "BGE", meaning: "Broad General Education (Scotland)" },
  { id: "caf", acronym: "CAF", meaning: "Common Assessment Framework" },
  { id: "cin", acronym: "CIN", meaning: "Child(ren) In Need" },
  { id: "cp", acronym: "CP", meaning: "Child Protection" },
  { id: "cpd", acronym: "CPD", meaning: "Continuing Professional Development" },
  { id: "dbs", acronym: "DBS", meaning: "Disclosure and Barring Service" },
  { id: "dc", acronym: "DC", meaning: "Devolved Capital" },
  { id: "dda", acronym: "DDA", meaning: "Disability Discrimination Act 1995" },
  { id: "dfe", acronym: "DFE", meaning: "Department for Education" },
  { id: "dsl", acronym: "DSL", meaning: "Designated Safeguarding Lead" },
  { id: "ea", acronym: "EA", meaning: "Equality Act 2010" },
  { id: "eal", acronym: "EAL", meaning: "English as an Additional Language" },
  { id: "ebd", acronym: "EBD", meaning: "Emotional and Behavioral Difficulties" },
  { id: "ect", acronym: "ECT", meaning: "Early Career Teacher" },
  { id: "ehcp", acronym: "EHCP", meaning: "Education, Health and Care Plan" },
  { id: "elg", acronym: "ELG", meaning: "Early Learning Goal" },
  { id: "ep", acronym: "EP", meaning: "Educational Psychologist" },
  { id: "ewo", acronym: "EWO", meaning: "Education Welfare Officer" },
  { id: "ey", acronym: "EY", meaning: "Early Years" },
  { id: "eyfs", acronym: "EYFS", meaning: "Early Years Foundation Stage" },
  { id: "eypp", acronym: "EYPP", meaning: "Early Years Pupil Premium" },
  { id: "fks", acronym: "FKS", meaning: "Foundation Key Stage" },
  { id: "flo", acronym: "FLO", meaning: "Family Liaison Officer" },
  { id: "fsm", acronym: "FSM", meaning: "Free School Meals" },
  { id: "gt", acronym: "G&T", meaning: "Gifted and Talented" },
  { id: "hlta", acronym: "HLTA", meaning: "Higher Level Teaching Assistant" },
  { id: "hod", acronym: "HOD", meaning: "Head of Department" },
  { id: "hoy", acronym: "HOY", meaning: "Head of Year" },
  { id: "ict", acronym: "ICT", meaning: "Information Communication Technology" },
  { id: "iep", acronym: "IEP", meaning: "Individual Education Plan" },
  { id: "inset", acronym: "INSET", meaning: "In-service Education and Training" },
  { id: "isa", acronym: "ISA", meaning: "Independent Schools Association" },
  { id: "isi", acronym: "ISI", meaning: "Independent Schools Inspectorate" },
  { id: "ite", acronym: "ITE", meaning: "Initial Teacher Education" },
  { id: "itt", acronym: "ITT", meaning: "Initial Teacher Training" },
  { id: "ks", acronym: "KS", meaning: "Key Stage" },
  { id: "ks1", acronym: "KS1", meaning: "Key Stage 1 (Ages 5–7)" },
  { id: "ks2", acronym: "KS2", meaning: "Key Stage 2 (Ages 7–11)" },
  { id: "ks3", acronym: "KS3", meaning: "Key Stage 3 (Ages 11–14)" },
  { id: "ks4", acronym: "KS4", meaning: "Key Stage 4 (Ages 14–16)" },
  { id: "ks5", acronym: "KS5", meaning: "Key Stage 5 (Post-16 / Sixth Form)" },
  { id: "la", acronym: "LA", meaning: "Local Authority" },
  { id: "lac", acronym: "LAC", meaning: "Looked After Children" },
  { id: "lo", acronym: "LO", meaning: "Learning Objective" },
  { id: "lp", acronym: "LP", meaning: "Lead Practitioner" },
  { id: "ls", acronym: "LS", meaning: "Learning Support" },
  { id: "lsa", acronym: "LSA", meaning: "Learning Support Assistant" },
  { id: "mat", acronym: "MAT", meaning: "Multi-Academy Trust" },
  { id: "mfl", acronym: "MFL", meaning: "Modern Foreign Languages" },
  { id: "mld", acronym: "MLD", meaning: "Moderate Learning Difficulties" },
  { id: "nasuwt", acronym: "NASUWT", meaning: "National Association of Schoolmasters Union of Women Teachers" },
  { id: "nff", acronym: "NFF", meaning: "National Funding Formula" },
  { id: "npqh", acronym: "NPQH", meaning: "National Professional Qualification for Headship" },
  { id: "nqt", acronym: "NQT", meaning: "Newly Qualified Teacher (legacy term; now ECT)" },
  { id: "nut", acronym: "NUT", meaning: "National Union of Teachers" },
  { id: "ofsted", acronym: "OFSTED", meaning: "Office for Standards in Education" },
  { id: "pgce", acronym: "PGCE", meaning: "Postgraduate Certificate in Education" },
  { id: "pm", acronym: "PM", meaning: "Performance Management" },
  { id: "pp", acronym: "PP", meaning: "Pupil Premium" },
  { id: "ppa", acronym: "PPA", meaning: "Planning, Preparation, and Assessment" },
  { id: "pta", acronym: "PTA", meaning: "Parent Teacher Association" },
  { id: "qft", acronym: "QFT", meaning: "Quality First Teaching" },
  { id: "qts", acronym: "QTS", meaning: "Qualified Teacher Status" },
  { id: "raise", acronym: "RAISE", meaning: "Reporting and Analysis for Improvement through School" },
  { id: "scitt", acronym: "SCITT", meaning: "School-Centred Initial Teacher Training" },
  { id: "sdp", acronym: "SDP", meaning: "School Development Plan" },
  { id: "sef", acronym: "SEF", meaning: "Self-Evaluation Form" },
  { id: "sen", acronym: "SEN", meaning: "Special Educational Needs" },
  { id: "send", acronym: "SEND", meaning: "Special Educational Needs and Disabilities" },
  { id: "senco", acronym: "SENCO", meaning: "Special Educational Needs Coordinator" },
  { id: "sendco", acronym: "SENDCO", meaning: "Special Educational Needs and Disabilities Coordinator" },
  { id: "sip", acronym: "SIP", meaning: "School Improvement Partner" },
  { id: "slcn", acronym: "SLCN", meaning: "Speech, Language and Communication Needs" },
  { id: "slt", acronym: "SLT", meaning: "Senior Leadership Team" },
  { id: "smt", acronym: "SMT", meaning: "Senior Management Team" },
  { id: "spag", acronym: "SPAG", meaning: "Spelling, Punctuation and Grammar" },
  { id: "stem", acronym: "STEM", meaning: "Science, Technology, Engineering and Maths" },
  { id: "ta", acronym: "TA", meaning: "Teaching Assistant" },
  { id: "tlr", acronym: "TLR", meaning: "Teaching and Learning Responsibility" },
  { id: "ups", acronym: "UPS", meaning: "Upper Pay Scale" },
  { id: "va", acronym: "VA", meaning: "Value Added" },
  { id: "itap", acronym: "ITAP", meaning: "Intensive Training and Practice" },
  { id: "niot", acronym: "NIoT", meaning: "National Institute of Teaching" },
  { id: "ittecf", acronym: "ITTECF", meaning: "Initial Teacher Training and Early Career Framework" },
];

const glossary: AppData["glossary"] = [
  {
    id: "mattering",
    term: "Mattering",
    definition:
      "Feeling important and valued because you both belong and can become. Mattering = Belonging + Becoming.",
    whyItMatters:
      "Core human need. When learners feel they matter they engage more, show more resilience, and stay motivated. Anti-mattering links to absence, poor behaviour, anxiety, and feeling invisible.",
    inPractice: [
      "Use a learner’s name and notice something specific about them.",
      "Give low-risk roles so they contribute (read an instruction, hand out resources).",
      "Give specific feedback on the quality of their thinking, not vague praise.",
    ],
    examples: [
      {
        id: "m1",
        kind: "source",
        text: "Alyssa belongs (greeted, buddied) but rarely contributes — move her from fitting in to flourishing with belonging language, becoming roles, and mattering feedback.",
      },
    ],
    related: ["belonging", "becoming", "high-expectations"],
    source: "ITAP1 Handout 1.2.1 · Mattering Model (Abdallah / Reach Foundation)",
    tags: ["itap1", "relationships", "behaviour"],
  },
  {
    id: "belonging",
    term: "Belonging",
    definition:
      "Feeling connected to the school community, accepted for who you are, and safe to be yourself.",
    whyItMatters:
      "Linked to higher achievement, better mental health, and engagement — but belonging alone is not enough if learners still feel they don’t make a difference.",
    inPractice: [
      "Greet every learner by name.",
      "Celebrate diverse backgrounds.",
      "Build positive relationships with learners and families.",
    ],
    examples: [],
    related: ["mattering", "becoming"],
    source: "ITAP1 Handout 1.2.1",
    tags: ["itap1", "relationships"],
  },
  {
    id: "becoming",
    term: "Becoming",
    definition:
      "Having chances to contribute, participate, grow, and add value — using skills, voice, and talents.",
    whyItMatters:
      "Belonging enables becoming; becoming reinforces belonging. Together they create a culture of mattering.",
    inPractice: [
      "Give roles and responsibilities (on rotation).",
      "Create student voice / leadership opportunities.",
      "Use mini whiteboards so more learners can answer, not only the confident few.",
    ],
    examples: [],
    related: ["mattering", "belonging"],
    source: "ITAP1 Handout 1.2.1",
    tags: ["itap1", "relationships"],
  },
  {
    id: "high-expectations",
    term: "High expectations",
    definition:
      "The belief that every pupil can make meaningful progress — communicated through language, routines, and relationships; stretching all pupils, not just some.",
    whyItMatters:
      "Labels and second-hand descriptions can quietly lower your tone, feedback, and support. High expectations means same standards with scaffolded support, not lowered bars.",
    inPractice: [
      "Judge learners on what you observe, not inherited labels (“lazy”, “keep an eye on them”).",
      "Give specific, task-focused, effort-based feedback.",
      "Script welcomes and “I don’t know” prompts.",
    ],
    examples: [],
    related: ["mattering", "routines"],
    source: "ITAP1 MTP Day 1 Session 3 · Handouts 1.3.x",
    tags: ["itap1", "behaviour"],
  },
  {
    id: "routines",
    term: "Classroom routines",
    definition:
      "Specific sequences of expected classroom behaviours performed consistently. Building blocks of classroom culture — clearly defined, taught, and practised until automatic.",
    whyItMatters:
      "Routines free working memory for learning. All children benefit from predictability; some learners benefit even more. Behaviour must be taught, not assumed.",
    inPractice: [
      "Plan instructions that are Specific & observable, Sequential, and Manageable (SSM).",
      "Teach and model in small steps; practise early; reboot when they slip.",
      "Key routines: entry, seating/location plan, handing out resources, getting attention, exit.",
    ],
    examples: [
      {
        id: "r1",
        kind: "practice",
        text: "Say “Pencils down and eyes to me” — not “Pay attention.”",
      },
      {
        id: "r2",
        kind: "practice",
        text: "Give instructions before distributing resources.",
      },
    ],
    related: ["norms", "behaviour-taught", "ssm"],
    source: "ITAP1 Handouts 2.1–2.3 · Beginning Teacher’s Behaviour Toolkit (Bennett)",
    tags: ["itap1", "behaviour", "routines"],
  },
  {
    id: "ssm",
    term: "SSM instructions",
    definition:
      "When scripting routine instructions: Specific & observable, Sequential, Manageable (few words; numbers/gestures help).",
    whyItMatters:
      "Vague instructions (“pay attention”) can’t be checked. Clear scripts make success visible and teachable.",
    inPractice: [
      "Specific: name the visible behaviour.",
      "Sequential: order of actions (“pens down, books closed, eyes on me”).",
      "Manageable: fewer words; replace with numbers or gestures.",
    ],
    examples: [],
    related: ["routines"],
    source: "ITAP1 Handout 2.2.1",
    tags: ["itap1", "routines"],
  },
  {
    id: "norms",
    term: "Classroom norms",
    definition:
      "The shared sense of what is acceptable and expected. Pupils look to peers for cues — the teacher must assert and constantly promote the desired norms.",
    whyItMatters:
      "If misbehaviour is the social norm, pupils drift toward it. Normative language (“In this classroom we…”) and consistent response when norms break matter.",
    inPractice: [
      "Introduce rules/expectations on first encounter — don’t leave them to guess.",
      "Respond whenever norms are broken; be consistent over time.",
      "Revisit norms, routines, and consequences with termly reboots.",
    ],
    examples: [],
    related: ["routines", "behaviour-taught"],
    source: "Beginning Teacher’s Behaviour Toolkit (Tom Bennett)",
    tags: ["behaviour"],
  },
  {
    id: "behaviour-taught",
    term: "Behaviour must be taught",
    definition:
      "Behaviour is a curriculum of habits, attitudes, and skills — not innate. Use proactive teaching of expectations plus fair reactive consequences.",
    whyItMatters:
      "Assuming all pupils can already behave successfully penalises those who need explicit teaching. Certainty of sanctions matters more than severity.",
    inPractice: [
      "Proactive: teach expected behaviour clearly with examples; check understanding.",
      "Reactive: fair sanctions when rules are broken; know the school policy.",
      "Script responses for common problems; ask for support when patterns persist.",
      "Distinguish acknowledgements (immediate, verbal) from rewards (consistent/notable achievements).",
    ],
    examples: [],
    related: ["routines", "norms", "least-invasive"],
    source: "Behaviour Toolkit (Bennett) · ITAP1 Day 3 rewards/sanctions",
    tags: ["itap1", "behaviour"],
  },
  {
    id: "least-invasive",
    term: "Least invasive corrections",
    definition:
      "Correct disruption with the smallest intervention that works — e.g. positive group correction, anonymous correction, private individual correction (Lemov).",
    whyItMatters:
      "Public, heavy-handed corrections can escalate and shame. Least-invasive keeps learning flowing and protects dignity.",
    inPractice: [
      "Prefer non-verbal / quiet corrections before stopping the whole class.",
      "Positive narration of the expected behaviour.",
      "Anonymous group correction before naming individuals.",
      "Economy of language; correct behaviour not the child; assume compliance (“thanks” not “please”).",
    ],
    examples: [],
    related: ["behaviour-taught", "routines"],
    source: "ITAP1 MTP Day 3 · Handouts 3.2–3.3",
    tags: ["itap1", "behaviour"],
  },
  {
    id: "deliberate-practice",
    term: "Deliberate practice",
    definition:
      "Rehearsing a precise teaching move (often scripted) with feedback until it becomes fluent — used heavily in ITAP for routines and sanctions.",
    whyItMatters:
      "Novices need practised scripts for entry, attention, resources, sanctions, etc., so decisions aren’t improvised under pressure.",
    inPractice: [
      "Write the script, practise delivery, refine with feedback.",
      "Used for entry routines, settling tasks, exit routines, sanction scripts.",
    ],
    examples: [],
    related: ["routines", "ssm"],
    source: "ITAP1 MTP (introduced Day 1 Session 3)",
    tags: ["itap1", "training"],
  },
  {
    id: "primm",
    term: "PRIMM",
    definition:
      "Predict → Run → Investigate → Modify → Make — a scaffolded way to structure programming lessons so learners read and talk about code before writing it.",
    whyItMatters:
      "Reduces emotional angst of “my code doesn’t work” early on; builds comprehension and discussion; research-backed for novice programmers.",
    inPractice: [
      "Predict outcome of a short starter program (low stakes).",
      "Run a provided program to check predictions.",
      "Investigate / modify before independent make.",
    ],
    examples: [],
    related: ["lead-with-concepts"],
    source: "Hello World — Big Book of Computing Pedagogy",
    tags: ["computing", "pedagogy"],
  },
  {
    id: "lead-with-concepts",
    term: "Lead with concepts",
    definition:
      "One of twelve NCCE / Raspberry Pi computing pedagogy principles: foreground the big ideas of computing, not just tools or syntax.",
    whyItMatters:
      "Helps learners transfer understanding across languages and contexts; pairs with concept maps, learning graphs, and careful simplification.",
    inPractice: [
      "Plan around key concepts before picking software.",
      "Use concept maps / learning graphs for progression.",
    ],
    examples: [],
    related: ["primm"],
    source: "Big Book of Computing Pedagogy — 12 principles",
    tags: ["computing", "pedagogy"],
  },
];

const events: AppData["events"] = [...PROGRAMME_EVENTS, ...HOLIDAY_BREAKS];

const tasks: AppData["tasks"] = [
  {
    id: "t-sp-upload",
    label:
      "Upload completed ITAP1 B&R Handout Booklet pages to SharePoint (evidence)",
    done: false,
    dueDate: "2026-08-28",
  },
  {
    id: "t-d1-script",
    label: "Handout 1.3.6 — finish expectation-setting welcome script",
    done: false,
    dueDate: "2026-08-26",
  },
  {
    id: "t-d1-reflect",
    label: "Handout 1.3.7 — What / So what / Now what reflection",
    done: false,
    dueDate: "2026-08-26",
  },
  {
    id: "t-d1-video",
    label: "Handout 1.3.5 — complete phase video reflection notes",
    done: false,
    dueDate: "2026-08-26",
  },
  {
    id: "t-d2-ei",
    label: "Handout 2.1.1–2.1.3 — EI annotate + scenarios + meta-cognitive reflection",
    done: false,
    dueDate: "2026-08-26",
  },
  {
    id: "t-d2-entry",
    label: "Handout 2.2.2 — write classroom entry routine script (SSM)",
    done: false,
    dueDate: "2026-08-26",
  },
  {
    id: "t-d2-seat",
    label: "Handout 2.3.2 — seating / location plan script",
    done: false,
    dueDate: "2026-08-26",
  },
  {
    id: "t-d2-res",
    label: "Handout 2.3.3 — handing out resources script (instructions before resources)",
    done: false,
    dueDate: "2026-08-26",
  },
  {
    id: "t-d2-attn",
    label: "Handout 2.3.4 — getting attention script",
    done: false,
    dueDate: "2026-08-26",
  },
  {
    id: "t-d2-ref",
    label: "Handout 2.3.5 — Day 2 end-of-day reflections",
    done: false,
    dueDate: "2026-08-26",
  },
  {
    id: "t-d3-env",
    label: "Handout 3.1.1–3.1.2 — learning environment reflection + rewrite instructions",
    done: false,
    dueDate: "2026-08-27",
  },
  {
    id: "t-d3-script",
    label: "Handout 3.3.3 — script & practise a behaviour scenario",
    done: false,
    dueDate: "2026-08-27",
  },
  {
    id: "t-d3-ref",
    label: "Handout 3.3.4–3.3.5 — Day 3 reflections + placement observation prompts",
    done: false,
    dueDate: "2026-08-27",
  },
  {
    id: "t-keep-booklet",
    label: "Keep ITAP1 Handout Booklet safe — required evidence of work",
    done: false,
    dueDate: "2026-09-04",
  },
];

const resources: AppData["resources"] = [
  {
    id: "sharepoint",
    name: "ITE Digital Portfolio (SharePoint)",
    url: "https://sldtrust.sharepoint.com/sites/ITE_Digital_Portfolio_2026-27/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FITE%5FDigital%5FPortfolio%5F2026%2D27%2FShared%20Documents%2FNorth%5FWest%2FOrmiston%5FNorth%2FComputing%2FBlessing%20Uche%281396743%29&viewid=b428b846%2Dd269%2D46d2%2D98ee%2D73d7523ca03b&FolderCTID=0x01200049E4BAD9BEF65E4285E88351AF87D71E",
    category: "qts",
    description: "Your evidence / portfolio folder — Ormiston North · Computing",
    relatedTopics: ["qts", "evidence"],
  },
  {
    id: "big-book",
    name: "Hello World — Big Book of Computing Pedagogy",
    url: "https://downloads.ctfassets.net/oshmmv7kdjgm/5I0kitx6JdV2mhA00baN5P/abf448f0660817021ffaaaa6ece509ae/Hello_World_The_Big_Book_of_Pedagogy.pdf",
    category: "computing",
    description: "12 pedagogical principles, PRIMM, unplugged, and more",
    relatedTopics: ["primm", "lead-with-concepts", "computing"],
  },
  {
    id: "behaviour-toolkit",
    name: "Beginning Teacher’s Behaviour Toolkit (Bennett)",
    localPath:
      "C:\\Users\\bless\\Dropbox\\000000 qts-niot\\Reading List\\The Beginning Teacher's behaviour toolkit.pdf",
    category: "reading",
    description: "Proactive/reactive behaviour, norms, routines, sanctions, rewards",
    relatedTopics: ["routines", "norms", "behaviour-taught"],
  },
  {
    id: "mattering-article",
    name: "The Mattering Model (Abdallah)",
    localPath:
      "C:\\Users\\bless\\Dropbox\\000000 qts-niot\\Reading List\\Articals\\01 The Mattering Model_ What if Belonging Is Only 50% of the Answer_ITAP1-1.2.1.pdf",
    category: "reading",
    description: "Belonging is only ~50% — Mattering = Belonging + Becoming",
    relatedTopics: ["mattering", "belonging", "becoming"],
  },
  {
    id: "computing-handbook",
    name: "Computing Trainee / Apprentice Handbook 26–27",
    localPath:
      "C:\\Users\\bless\\Dropbox\\000000 qts-niot\\NIoT_ITE_Computing_TraineeApprenticeHandbook 26 -27.pdf",
    category: "qts",
    description: "Subject handbook — programme expectations for Computing",
    relatedTopics: ["qts", "computing"],
  },
  {
    id: "mentor-handbook",
    name: "NIoT Mentor Handbook 2026–27",
    localPath:
      "C:\\Users\\bless\\Dropbox\\000000 qts-niot\\NIoT_Mentor Handbook_2026_27.docx",
    category: "qts",
    description: "Mentor roles, reports, observations, support stages",
    relatedTopics: ["mentor", "reports"],
  },
  {
    id: "managing-mentor-handbook",
    name: "NIoT Managing Mentor Handbook 2026–27",
    localPath:
      "C:\\Users\\bless\\Dropbox\\000000 qts-niot\\NIoT_ManagingMentor Handbook_2026_27.docx",
    category: "qts",
    description: "Managing mentor guidance for placement oversight",
    relatedTopics: ["mentor", "placement"],
  },
  {
    id: "programme-calendar",
    name: "TRAINEE Programme Calendar 2026–2027",
    localPath:
      "C:\\Users\\bless\\Dropbox\\000000 qts-niot\\I\\TRAINEE Programme Calendar for 2026-2027.xlsx",
    category: "qts",
    description: "Source timetable + Key Assessment Dates tab",
    relatedTopics: ["calendar", "assessments"],
  },
];

const reminders: AppData["reminders"] = [
  {
    id: "rem1",
    text: "Give instructions before distributing resources.",
  },
  {
    id: "rem2",
    text: "Mattering = Belonging + Becoming.",
  },
  {
    id: "rem3",
    text: "Instructions: Specific & observable → Sequential → Manageable.",
  },
];

export function createSeedData(): AppData {
  return {
    seedVersion: SEED_VERSION,
    acronyms,
    glossary,
    events,
    assessments: KEY_ASSESSMENTS.map((a) => ({ ...a, notes: "" })),
    tasks: tasks.map((t) => ({ ...t, notes: t.notes ?? "" })),
    resources,
    reminders,
    captures: [],
    srs: {},
  };
}
