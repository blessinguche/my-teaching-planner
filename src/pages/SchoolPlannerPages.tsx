import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useOutletContext } from "react-router-dom";
import {
  ConfirmDialog,
  JumpTiles,
  LabelRow,
  PlannerInput,
  PlannerNoteBox,
  PlannerPageShell,
  PlannerSelect,
  Sheet,
} from "../components/PlannerUI";
import { addDays, todayISO } from "../data/dates";
import { uid, useStore } from "../data/store";
import { timetableEventsOnDate } from "../data/timetableEvents";
import type {
  CalendarWeekNote,
  FindEntry,
  KeyRolesMap,
  LoginEntry,
  MeetingNote,
  PlacementProfile,
  PlanningResources,
  ProudPlace,
  School,
  TrainingTarget,
  WeeklyPlan,
} from "../data/types";

type SchoolCtx = { school: School };

function useSchool() {
  return useOutletContext<SchoolCtx>().school;
}

/** Scroll to #hash when landing on Focus / Planning from TOC or redirects. */
function useSectionHash() {
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 40);
    return () => window.clearTimeout(t);
  }, []);
}

function mondayOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - dow);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
const ROLE_DEFAULT: Omit<KeyRolesMap, "schoolId"> = {
  placement: "",
  headteacher: "",
  deputy: "",
  sendco: "",
  dsl: "",
  otherRoles: "",
  myResponsibilities: "",
  otherNotes: "",
};

function FocusRedirect({ hash }: { hash: string }) {
  const school = useSchool();
  return <Navigate to={`/school/${school.id}/focus#${hash}`} replace />;
}

function PlanningRedirect({ hash }: { hash: string }) {
  const school = useSchool();
  return <Navigate to={`/school/${school.id}/planning#${hash}`} replace />;
}

/* ─── Home ─── */

export function SchoolHomePage() {
  const school = useSchool();
  const base = `/school/${school.id}`;
  const sections: { title: string; items: [string, string, string][] }[] = [
    {
      title: "Class",
      items: [
        ["Student notes", "Name · notes lined sheet", `${base}/students`],
        ["Groups", "Three-column group planner", `${base}/groups`],
      ],
    },
    {
      title: "Timetable",
      items: [["Weekly timetable", "Periods, times and classes", `${base}/timetable`]],
    },
    {
      title: "Notes",
      items: [
        ["Mentor meeting", "Lined notes + priorities", `${base}/mentor`],
        ["Observing others", "Observation sheet", `${base}/observing`],
        [
          "Classroom practice",
          "Dot-grid notes & ideas",
          `${base}/classroom-practice`,
        ],
      ],
    },
    {
      title: "Focus",
      items: [
        ["About me", "Profile & placement details", `${base}/focus#info`],
        ["Logins", "Usernames & passwords", `${base}/focus#logins`],
        ["Key roles", "Who’s who in school", `${base}/focus#roles`],
        ["Resources", "Books & useful finds", `${base}/focus#resources`],
        ["Proud place", "Reflection", `${base}/focus#proud`],
      ],
    },
    {
      title: "Calendar",
      items: [["Month calendar", "Spread with notes column", `${base}/calendar`]],
    },
    {
      title: "Planning",
      items: [
        ["Weekly plan", "Mon–Fri · periods + reflection", `${base}/planning#weekly`],
        ["Planning resources", "Schemes, tools, meetings", `${base}/planning#resources`],
        ["Placement overview", "Medium-term grid", `${base}/overview`],
      ],
    },
    {
      title: "Training",
      items: [
        ["Targets", "Mentor targets log", `${base}/training#targets`],
        [
          "Assignments",
          "Teacher training tracker",
          `${base}/training#assignments`,
        ],
      ],
    },
    {
      title: "Records",
      items: [
        ["Attendance", "Daily marks", `${base}/records#attendance`],
        ["Behaviour log", "Incidents", `${base}/records#behaviour`],
        ["Grades", "Scores", `${base}/records#grades`],
        ["Homework", "Due work", `${base}/records#homework`],
      ],
    },
  ];

  return (
    <PlannerPageShell
      school={school}
      section="Contents"
      title="Placement planner"
      caption="Open a page like a paper spread — write inline with Short Stack. Hub is always one tap away."
    >
      <div>
        {sections.map((sec) => (
          <section key={sec.title} className="toc-section">
            <h2 className="planner-section-title">{sec.title}</h2>
            <div className="toc-grid">
              {sec.items.map(([label, blurb, to]) => (
                <Link key={to} to={to} className="toc-card">
                  {label}
                  <span>{blurb}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PlannerPageShell>
  );
}

/* ─── Focus (merged) ─── */

function FocusInfoSection({ school }: { school: School }) {
  const { data, patchData } = useStore();
  const profile =
    data.placementProfiles.find((p) => p.schoolId === school.id) ??
    ({
      schoolId: school.id,
      name: "",
      placementSchools: school.name,
      trainingProvider: "",
      email: "",
      phaseSubject: "",
    } satisfies PlacementProfile);

  function save(next: PlacementProfile) {
    patchData((prev) => {
      const rest = prev.placementProfiles.filter((p) => p.schoolId !== school.id);
      return { ...prev, placementProfiles: [...rest, next] };
    });
  }

  return (
    <section id="info" className="planner-block">
      <h2 className="planner-heading">About Me</h2>
      <p className="planner-caption">Personalises the planner — keep placement details in one place.</p>
      <Sheet>
        <div className="planner-grid">
          {(
            [
              ["NAME", "name"],
              ["PLACEMENT SCHOOL/S", "placementSchools"],
              ["TRAINING PROVIDER", "trainingProvider"],
              ["EMAIL ADDRESS", "email"],
              ["TEACHING PHASE / SUBJECT", "phaseSubject"],
            ] as const
          ).map(([label, key]) => (
            <LabelRow key={key} label={label}>
              <PlannerInput
                value={profile[key]}
                onChange={(v) => save({ ...profile, [key]: v })}
              />
            </LabelRow>
          ))}
        </div>
      </Sheet>
    </section>
  );
}

function FocusLoginsSection({ school }: { school: School }) {
  const { data, patchData } = useStore();
  const rows = data.logins.filter((l) => l.schoolId === school.id);
  const blanks = Math.max(12 - rows.length, 3);

  function upsert(row: LoginEntry) {
    patchData((prev) => {
      const exists = prev.logins.some((l) => l.id === row.id);
      return {
        ...prev,
        logins: exists
          ? prev.logins.map((l) => (l.id === row.id ? row : l))
          : [...prev.logins, row],
      };
    });
  }

  function ensureBlank() {
    upsert({
      id: uid("login"),
      schoolId: school.id,
      website: "",
      username: "",
      password: "",
    });
  }

  const display = [
    ...rows,
    ...Array.from({ length: blanks }, (_, i) => ({
      id: `blank-${i}`,
      schoolId: school.id,
      website: "",
      username: "",
      password: "",
      _blank: true as const,
    })),
  ];

  return (
    <section id="logins" className="planner-block">
      <h2 className="planner-heading">Usernames and Passwords</h2>
      <p className="planner-caption">Keep track of usernames and passwords for school resources.</p>
      <Sheet className="stackable-table login-table">
        <div className="planner-bar login-table-bar">
          <span>Website / App</span>
          <span>Username</span>
          <span>Password</span>
        </div>
        <div className="planner-grid joined">
          {display.map((row) => (
            <div key={row.id} className="planner-row login-table-row">
              {(["website", "username", "password"] as const).map((key) => (
                <div
                  key={key}
                  className="planner-cell"
                  data-label={
                    key === "website"
                      ? "Website / App"
                      : key === "username"
                        ? "Username"
                        : "Password"
                  }
                >
                  <PlannerInput
                    value={"_blank" in row ? "" : row[key]}
                    onChange={(v) => {
                      if ("_blank" in row) {
                        upsert({
                          id: uid("login"),
                          schoolId: school.id,
                          website: "",
                          username: "",
                          password: "",
                          [key]: v,
                        });
                        return;
                      }
                      upsert({ ...row, [key]: v });
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Sheet>
      <button type="button" className="btn" style={{ marginTop: "0.75rem" }} onClick={ensureBlank}>
        + Add row
      </button>
    </section>
  );
}

function FocusRolesSection({ school }: { school: School }) {
  const { data, patchData } = useStore();
  const roles =
    data.keyRoles.find((r) => r.schoolId === school.id) ??
    ({ schoolId: school.id, ...ROLE_DEFAULT } satisfies KeyRolesMap);

  function save(next: KeyRolesMap) {
    patchData((prev) => ({
      ...prev,
      keyRoles: [
        ...prev.keyRoles.filter((r) => r.schoolId !== school.id),
        next,
      ],
    }));
  }

  const fields: [string, keyof Omit<KeyRolesMap, "schoolId">][] = [
    ["PLACEMENT", "placement"],
    ["HEADTEACHER", "headteacher"],
    ["DEPUTY HEAD", "deputy"],
    ["SENDCO", "sendco"],
    ["DESIGNATED SAFEGUARDING LEAD/S", "dsl"],
    ["OTHER ROLES", "otherRoles"],
    ["MY RESPONSIBILITIES", "myResponsibilities"],
    ["OTHER NOTES", "otherNotes"],
  ];

  return (
    <section id="roles" className="planner-block">
      <h2 className="planner-heading">Key Roles</h2>
      <p className="planner-caption">Roles within your setting which are important to know.</p>
      <div className="planner-grid">
        {fields.map(([label, key]) => (
          <LabelRow key={key} label={label}>
            <PlannerInput
              multiline={key === "otherNotes" || key === "myResponsibilities"}
              rows={3}
              value={roles[key]}
              onChange={(v) => save({ ...roles, [key]: v })}
            />
          </LabelRow>
        ))}
      </div>
    </section>
  );
}

const SOCIAL_PLATFORMS = [
  { id: "x", label: "X" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "pinterest", label: "Pinterest" },
] as const;

type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]["id"];

function SocialPlatformIcon({ id }: { id: SocialPlatformId }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true as const,
  };
  switch (id) {
    case "x":
      return (
        <svg {...common}>
          <path d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.4L6.2 22H3l7.3-8.4L1.5 2H7.9l4.4 5.8L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm9.2 1.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7.2A4.8 4.8 0 1 1 12 16.8 4.8 4.8 0 0 1 12 7.2Zm0 2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M14.5 22v-8.2h2.8l.4-3.2h-3.2V8.6c0-.9.3-1.6 1.6-1.6h1.7V4.2c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H8.5v3.2h2.6V22h3.4Z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M16.5 2c.5 2.4 2.1 4.2 4.5 4.7v2.5c-1.6.1-3.1-.4-4.5-1.3v6.7c0 3.5-2.8 6.4-6.4 6.4S3.7 18.1 3.7 14.6c0-3.4 2.7-6.2 6.1-6.4v2.7c-1.9.2-3.4 1.8-3.4 3.7 0 2.1 1.7 3.7 3.8 3.7s3.7-1.6 3.7-3.7V2h2.6Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <path d="M22.5 8.2a3.1 3.1 0 0 0-2.2-2.2C18.4 5.5 12 5.5 12 5.5s-6.4 0-8.3.5A3.1 3.1 0 0 0 1.5 8.2 32 32 0 0 0 1 12a32 32 0 0 0 .5 3.8 3.1 3.1 0 0 0 2.2 2.2c1.9.5 8.3.5 8.3.5s6.4 0 8.3-.5a3.1 3.1 0 0 0 2.2-2.2A32 32 0 0 0 23 12a32 32 0 0 0-.5-3.8ZM10 15.2V8.8l5.2 3.2L10 15.2Z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2.1 0-3 .2-.8 1.4-6 1.4-6s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.4-.9 3.8-.3 1.1.6 2 1.7 2 2.1 0 3.5-2.7 3.5-5.9 0-2.4-1.6-4.2-4.6-4.2-3.3 0-5.4 2.5-5.4 5.2 0 1 .3 1.7.8 2.2.1.1.1.2.1.3l-.3 1.1c0 .2-.2.2-.4.1-1.4-.6-2-2.2-2-4 0-3 2.5-6.7 7.5-6.7 4 0 6.7 2.9 6.7 6 0 4.1-2.3 7.1-5.6 7.1-1.1 0-2.2-.6-2.6-1.3l-.7 2.7c-.2.9-.9 2-1.4 2.7A10 10 0 1 0 12 2Z" />
        </svg>
      );
  }
}

function SocialPlatformPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (platform: SocialPlatformId) => void;
}) {
  return (
    <div className="social-platform-picker" role="radiogroup" aria-label="Platform">
      {SOCIAL_PLATFORMS.map((p) => {
        const selected = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={p.label}
            title={p.label}
            className={`social-platform-btn${selected ? " is-selected" : ""}`}
            onClick={() => onChange(p.id)}
          >
            <SocialPlatformIcon id={p.id} />
          </button>
        );
      })}
    </div>
  );
}

function FocusResourcesSection({ school }: { school: School }) {
  const { data, patchData } = useStore();
  const finds = data.finds.filter((f) => f.schoolId === school.id);

  function upsert(row: FindEntry) {
    patchData((prev) => {
      const exists = prev.finds.some((f) => f.id === row.id);
      return {
        ...prev,
        finds: exists
          ? prev.finds.map((f) => (f.id === row.id ? row : f))
          : [...prev.finds, row],
      };
    });
  }

  function section(kind: Exclude<FindEntry["kind"], "social">, title: string, cols: string[]) {
    const rows = finds.filter((f) => f.kind === kind);
    const blanks = Math.max(8 - rows.length, 2);
    const display = [
      ...rows,
      ...Array.from({ length: blanks }, (_, i) => ({
        id: `blank-${kind}-${i}`,
        schoolId: school.id,
        kind,
        title: "",
        description: "",
        rating: "",
        platform: "",
        _blank: true as const,
      })),
    ];
    return (
      <div className="planner-block">
        <div className="planner-banner">{title}</div>
        <Sheet className="stackable-table finds-table">
          <div className="planner-bar soft finds-table-bar">
            {cols.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <div className="planner-grid joined">
            {display.map((row) => (
              <div key={row.id} className="planner-row finds-table-row">
                {(["title", "description", "rating"] as const).map((key, i) => (
                  <div
                    key={key}
                    className="planner-cell"
                    data-label={cols[i] ?? key}
                  >
                    <PlannerInput
                      value={"_blank" in row ? "" : row[key]}
                      onChange={(v) => {
                        if ("_blank" in row) {
                          upsert({
                            id: uid("find"),
                            schoolId: school.id,
                            kind,
                            title: "",
                            description: "",
                            rating: "",
                            [key]: v,
                          });
                          return;
                        }
                        upsert({ ...row, [key]: v });
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Sheet>
        <button
          type="button"
          className="btn"
          style={{ marginTop: "0.55rem" }}
          onClick={() =>
            upsert({
              id: uid("find"),
              schoolId: school.id,
              kind,
              title: "",
              description: "",
              rating: "",
            })
          }
        >
          + Add row
        </button>
      </div>
    );
  }

  function socialSection() {
    const rows = finds.filter((f) => f.kind === "social");
    const blanks = Math.max(8 - rows.length, 2);
    const display = [
      ...rows,
      ...Array.from({ length: blanks }, (_, i) => ({
        id: `blank-social-${i}`,
        schoolId: school.id,
        kind: "social" as const,
        title: "",
        description: "",
        rating: "",
        platform: "",
        _blank: true as const,
      })),
    ];

    function write(
      row: (typeof display)[number],
      patch: Partial<FindEntry>,
    ) {
      if ("_blank" in row) {
        upsert({
          id: uid("find"),
          schoolId: school.id,
          kind: "social",
          title: "",
          description: "",
          rating: "",
          platform: "",
          ...patch,
        });
        return;
      }
      upsert({ ...row, ...patch });
    }

    return (
      <div className="planner-block">
        <div className="planner-banner">Social / posts</div>
        <div className="planner-x-scroll social-finds-scroll">
          <Sheet className="social-finds-sheet">
            <div className="planner-bar soft social-finds-bar">
              <span>Platform</span>
              <span>Handle</span>
              <span>Description</span>
              <span>Rating</span>
            </div>
            <div className="planner-grid joined social-finds-grid">
              {display.map((row) => (
                <div key={row.id} className="planner-row social-finds-row">
                  <div className="planner-cell social-platform-cell">
                    <SocialPlatformPicker
                      value={"_blank" in row ? "" : row.platform ?? ""}
                      onChange={(platform) => write(row, { platform })}
                    />
                  </div>
                  <div className="planner-cell">
                    <PlannerInput
                      value={"_blank" in row ? "" : row.title}
                      placeholder="@handle"
                      onChange={(v) => write(row, { title: v })}
                    />
                  </div>
                  <div className="planner-cell">
                    <PlannerInput
                      value={"_blank" in row ? "" : row.description}
                      onChange={(v) => write(row, { description: v })}
                    />
                  </div>
                  <div className="planner-cell">
                    <PlannerInput
                      value={"_blank" in row ? "" : row.rating}
                      onChange={(v) => write(row, { rating: v })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Sheet>
        </div>
        <button
          type="button"
          className="btn"
          style={{ marginTop: "0.55rem" }}
          onClick={() =>
            upsert({
              id: uid("find"),
              schoolId: school.id,
              kind: "social",
              title: "",
              description: "",
              rating: "",
              platform: "",
            })
          }
        >
          + Add row
        </button>
      </div>
    );
  }

  return (
    <section id="resources" className="planner-block">
      <h2 className="planner-heading">Useful Finds</h2>
      <p className="planner-caption">Books, apps, websites and recommendations — one resources section.</p>
      <div className="planner-stack">
        {section("book", "Books I've read", ["Title", "Description", "Rating"])}
        {section("app", "Apps", ["Title", "Description", "Rating"])}
        {section("website", "Websites", ["Web address", "Description", "Rating"])}
        {socialSection()}
      </div>
    </section>
  );
}

function FocusTargetsSection({ school }: { school: School }) {
  const { data, patchData } = useStore();
  const [placement, setPlacement] = useState<1 | 2 | 3>(1);

  function target(slot: 1 | 2 | 3): TrainingTarget {
    return (
      data.trainingTargets.find(
        (t) =>
          t.schoolId === school.id &&
          t.placement === placement &&
          t.slot === slot,
      ) ?? {
        id: uid("tgt"),
        schoolId: school.id,
        placement,
        slot,
        target: "",
        standardsRef: "",
        midProgress: "",
        midActions: "",
        endProgress: "",
        endActions: "",
      }
    );
  }

  function save(row: TrainingTarget) {
    patchData((prev) => {
      const idx = prev.trainingTargets.findIndex(
        (t) =>
          t.schoolId === row.schoolId &&
          t.placement === row.placement &&
          t.slot === row.slot,
      );
      if (idx >= 0) {
        const next = [...prev.trainingTargets];
        next[idx] = { ...row, id: prev.trainingTargets[idx]!.id };
        return { ...prev, trainingTargets: next };
      }
      return { ...prev, trainingTargets: [...prev.trainingTargets, row] };
    });
  }

  return (
    <section id="targets" className="planner-block">
      <h2 className="planner-heading">Teacher Training Targets</h2>
      <p className="planner-caption">
        Keep track of targets from mentor meetings — mid-point and end reviews side by side.
      </p>
      <div className="planner-stack">
      <div className="planner-meta">
        <label>
          Placement
          <PlannerSelect
            value={String(placement)}
            onChange={(v) => setPlacement(Number(v) as 1 | 2 | 3)}
          >
            <option value={1}>One</option>
            <option value={2}>Two</option>
            <option value={3}>Three</option>
          </PlannerSelect>
        </label>
      </div>
      {([1, 2, 3] as const).map((slot) => {
        const row = target(slot);
        return (
          <Sheet key={slot}>
            <div className="planner-bar" style={{ display: "block" }}>
              Target for development {slot}
            </div>
            <div className="planner-grid joined">
              <LabelRow label="Target">
                <PlannerInput
                  multiline
                  rows={3}
                  value={row.target}
                  onChange={(v) => save({ ...row, target: v })}
                />
              </LabelRow>
              <LabelRow label="Teacher standards reference">
                <PlannerInput
                  value={row.standardsRef}
                  onChange={(v) => save({ ...row, standardsRef: v })}
                />
              </LabelRow>
            </div>
            <div className="targets-review-grid">
              <div className="targets-review-col">
                <div className="planner-bar soft">Mid-point review</div>
                <div className="planner-grid">
                  <LabelRow label="Progress">
                    <PlannerInput
                      multiline
                      rows={4}
                      lined
                      value={row.midProgress}
                      onChange={(v) => save({ ...row, midProgress: v })}
                    />
                  </LabelRow>
                  <LabelRow label="Continuing actions">
                    <PlannerInput
                      multiline
                      rows={4}
                      lined
                      value={row.midActions}
                      onChange={(v) => save({ ...row, midActions: v })}
                    />
                  </LabelRow>
                </div>
              </div>
              <div className="targets-review-col">
                <div className="planner-bar soft">End of placement</div>
                <div className="planner-grid">
                  <LabelRow label="Progress">
                    <PlannerInput
                      multiline
                      rows={4}
                      lined
                      value={row.endProgress}
                      onChange={(v) => save({ ...row, endProgress: v })}
                    />
                  </LabelRow>
                  <LabelRow label="Continuing actions">
                    <PlannerInput
                      multiline
                      rows={4}
                      lined
                      value={row.endActions}
                      onChange={(v) => save({ ...row, endActions: v })}
                    />
                  </LabelRow>
                </div>
              </div>
            </div>
          </Sheet>
        );
      })}
      </div>
    </section>
  );
}

function TrainingAssignmentsSection({ school }: { school: School }) {
  const { data, patchData } = useStore();
  const rows = (data.trainingAssignments ?? []).filter(
    (a) => a.schoolId === school.id,
  );
  const blanks = Math.max(12 - rows.length, 3);

  function upsert(row: {
    id: string;
    schoolId: string;
    title: string;
    className: string;
    dueDate: string;
    done: boolean;
    grade: string;
  }) {
    patchData((prev) => {
      const list = prev.trainingAssignments ?? [];
      const exists = list.some((a) => a.id === row.id);
      return {
        ...prev,
        trainingAssignments: exists
          ? list.map((a) => (a.id === row.id ? row : a))
          : [...list, row],
      };
    });
  }

  const display = [
    ...rows,
    ...Array.from({ length: blanks }, (_, i) => ({
      id: `blank-asgn-${i}`,
      schoolId: school.id,
      title: "",
      className: "",
      dueDate: "",
      done: false,
      grade: "",
      _blank: true as const,
    })),
  ];

  function write(
    row: (typeof display)[number],
    patch: Partial<{
      title: string;
      className: string;
      dueDate: string;
      done: boolean;
      grade: string;
    }>,
  ) {
    if ("_blank" in row) {
      upsert({
        id: uid("asgn"),
        schoolId: school.id,
        title: "",
        className: "",
        dueDate: "",
        done: false,
        grade: "",
        ...patch,
      });
      return;
    }
    upsert({ ...row, ...patch });
  }

  return (
    <section id="assignments" className="planner-block">
      <h2 className="planner-heading">Assignment Tracker</h2>
      <p className="planner-caption">Teacher training assignments</p>
      <div className="assignment-tracker-table stackable-table">
      <Sheet>
        <div className="planner-bar assignment-tracker-bar">
          <span>Assignment title</span>
          <span>Class</span>
          <span>Due date</span>
          <span>Done</span>
          <span>Grade</span>
        </div>
        <div className="planner-grid joined assignment-tracker">
          {display.map((row) => (
            <div key={row.id} className="planner-row assignment-tracker-row">
              <div className="planner-cell" data-label="Assignment title">
                <PlannerInput
                  value={"_blank" in row ? "" : row.title}
                  onChange={(v) => write(row, { title: v })}
                />
              </div>
              <div className="planner-cell" data-label="Class">
                <PlannerInput
                  value={"_blank" in row ? "" : row.className}
                  onChange={(v) => write(row, { className: v })}
                />
              </div>
              <div className="planner-cell" data-label="Due date">
                <input
                  className="planner-input"
                  type="date"
                  value={"_blank" in row ? "" : row.dueDate}
                  onChange={(e) => write(row, { dueDate: e.target.value })}
                />
              </div>
              <div
                className="planner-cell assignment-done-cell"
                data-label="Done"
              >
                <button
                  type="button"
                  className={`assignment-done-btn${
                    !("_blank" in row) && row.done ? " is-done" : ""
                  }`}
                  aria-label={
                    !("_blank" in row) && row.done ? "Mark not done" : "Mark done"
                  }
                  aria-pressed={!("_blank" in row) && row.done}
                  onClick={() =>
                    write(row, {
                      done: !("_blank" in row) ? !row.done : true,
                    })
                  }
                />
              </div>
              <div className="planner-cell" data-label="Grade">
                <PlannerInput
                  value={"_blank" in row ? "" : row.grade}
                  onChange={(v) => write(row, { grade: v })}
                />
              </div>
            </div>
          ))}
        </div>
      </Sheet>
      </div>
      <button
        type="button"
        className="btn"
        style={{ marginTop: "0.55rem" }}
        onClick={() =>
          upsert({
            id: uid("asgn"),
            schoolId: school.id,
            title: "",
            className: "",
            dueDate: "",
            done: false,
            grade: "",
          })
        }
      >
        + Add row
      </button>
    </section>
  );
}

function FocusProudSection({ school }: { school: School }) {
  const { data, patchData } = useStore();
  const proud =
    data.proudPlaces.find((p) => p.schoolId === school.id) ??
    ({ schoolId: school.id, proud: "", nextAchieve: "" } satisfies ProudPlace);

  function save(next: ProudPlace) {
    patchData((prev) => ({
      ...prev,
      proudPlaces: [
        ...prev.proudPlaces.filter((p) => p.schoolId !== school.id),
        next,
      ],
    }));
  }

  return (
    <section id="proud" className="planner-block">
      <h2 className="planner-heading">Placement Reflection</h2>
      <p className="planner-caption">Things to be proud of — and what to achieve next.</p>
      <div className="planner-stack">
        <PlannerNoteBox
          name={`proud-${school.id}`}
          label="Things to be proud of this placement"
          value={proud.proud}
          onChange={(v) => save({ ...proud, proud: v })}
          minHeight={180}
        />
        <PlannerNoteBox
          name={`next-${school.id}`}
          label="Things to achieve next placement"
          value={proud.nextAchieve}
          onChange={(v) => save({ ...proud, nextAchieve: v })}
          minHeight={180}
        />
      </div>
    </section>
  );
}

export function SchoolFocusPage() {
  const school = useSchool();
  useSectionHash();

  return (
    <PlannerPageShell
      school={school}
      section="Focus"
      title="Teacher Focus"
      caption="About you, logins, roles, finds and reflection — jump to a section below."
      backTo={`/school/${school.id}`}
      backLabel="Home"
    >
      <div style={{ gridColumn: "1 / -1" }}>
        <JumpTiles
          items={[
            { id: "info", label: "About me", blurb: "Profile" },
            { id: "logins", label: "Logins", blurb: "Passwords" },
            { id: "roles", label: "Roles", blurb: "Who’s who" },
            { id: "resources", label: "Resources", blurb: "Finds" },
            { id: "proud", label: "Proud", blurb: "Reflection" },
          ]}
        />
        <div className="planner-stack">
          <FocusInfoSection school={school} />
          <FocusLoginsSection school={school} />
          <FocusRolesSection school={school} />
          <FocusResourcesSection school={school} />
          <FocusProudSection school={school} />
        </div>
      </div>
    </PlannerPageShell>
  );
}

export function SchoolInfoPage() {
  return <FocusRedirect hash="info" />;
}
export function SchoolLoginsPage() {
  return <FocusRedirect hash="logins" />;
}
export function SchoolRolesPage() {
  return <FocusRedirect hash="roles" />;
}
export function SchoolResourcesFindsPage() {
  return <FocusRedirect hash="resources" />;
}
export function SchoolTargetsPage() {
  const school = useSchool();
  useSectionHash();

  return (
    <PlannerPageShell
      school={school}
      section="Training"
      title="Training"
      caption="Targets and teacher training assignments — jump to a section below."
      backTo={`/school/${school.id}`}
      backLabel="Home"
    >
      <div style={{ gridColumn: "1 / -1" }}>
        <JumpTiles
          items={[
            { id: "targets", label: "Targets", blurb: "Mentor targets" },
            {
              id: "assignments",
              label: "Assignments",
              blurb: "Tracker",
            },
          ]}
        />
        <div className="planner-stack">
          <FocusTargetsSection school={school} />
          <TrainingAssignmentsSection school={school} />
        </div>
      </div>
    </PlannerPageShell>
  );
}
export function SchoolProudPage() {
  return <FocusRedirect hash="proud" />;
}

/* ─── Calendar ─── */

export function SchoolCalendarSpreadPage() {
  const school = useSchool();
  const { data, patchData } = useStore();
  const [cursor, setCursor] = useState(todayISO().slice(0, 7) + "-01");
  const year = Number(cursor.slice(0, 4));
  const month = Number(cursor.slice(5, 7)) - 1;

  const weeks = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - startOffset);
    const out: string[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: string[] = [];
      for (let d = 0; d < 7; d++) {
        const cell = new Date(start);
        cell.setDate(start.getDate() + w * 7 + d);
        const yy = cell.getFullYear();
        const mm = String(cell.getMonth() + 1).padStart(2, "0");
        const dd = String(cell.getDate()).padStart(2, "0");
        row.push(`${yy}-${mm}-${dd}`);
      }
      out.push(row);
    }
    return out;
  }, [year, month]);

  const closures = school.closures;
  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));

  const dayCols = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Notes"];

  function weekNote(weekStart: string): CalendarWeekNote | undefined {
    return (data.calendarWeekNotes ?? []).find(
      (n) => n.schoolId === school.id && n.weekStart === weekStart,
    );
  }

  function saveWeekNote(weekStart: string, note: string) {
    patchData((prev) => {
      const list = prev.calendarWeekNotes ?? [];
      const existing = list.find(
        (n) => n.schoolId === school.id && n.weekStart === weekStart,
      );
      if (existing) {
        return {
          ...prev,
          calendarWeekNotes: list.map((n) =>
            n.id === existing.id ? { ...n, note } : n,
          ),
        };
      }
      const row: CalendarWeekNote = {
        id: uid("cwn"),
        schoolId: school.id,
        weekStart,
        note,
      };
      return { ...prev, calendarWeekNotes: [...list, row] };
    });
  }

  return (
    <PlannerPageShell
      school={school}
      section="Calendar"
      title={monthLabel}
      caption="Landscape month spread — school closures marked from term dates."
      backTo={`/school/${school.id}`}
      backLabel="Home"
    >
      <div>
        <div className="planner-meta">
          <button
            type="button"
            className="btn"
            onClick={() => {
              const d = new Date(year, month - 1, 1);
              setCursor(
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
              );
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const d = new Date(year, month + 1, 1);
              setCursor(
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
              );
            }}
          >
            ›
          </button>
        </div>
        <div className="school-days-wrap month-calendar-scroll">
        <Sheet className="month-calendar-sheet">
          <div className="planner-bar month-week-bar">
            {dayCols.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="planner-grid joined month-calendar-grid">
            {weeks.map((week, wi) => {
              const weekStart = week[0]!;
              const note = weekNote(weekStart)?.note ?? "";
              return (
                <div key={wi} className="planner-row month-week-row">
                  {week.map((iso, di) => {
                    const inMonth = Number(iso.slice(5, 7)) === month + 1;
                    const hit = closures.find((c) => c.start <= iso && iso <= c.end);
                    const stored = data.events.filter(
                      (e) =>
                        e.date === iso &&
                        (!e.schoolId || e.schoolId === school.id),
                    );
                    const lessons = hit
                      ? []
                      : timetableEventsOnDate(
                          data.schools,
                          data.timetable,
                          iso,
                          school.id,
                        );
                    const events = [...stored, ...lessons];
                    return (
                      <div
                        key={iso}
                        className="planner-cell month-cell"
                        data-label={dayCols[di]}
                        style={{ opacity: inMonth ? 1 : 0.35 }}
                      >
                        <div className="date-num">
                          {Number(iso.slice(8))}
                          {iso.slice(8) === "01" || iso.slice(8) === "21" || iso.slice(8) === "31"
                            ? "st"
                            : iso.slice(8) === "02" || iso.slice(8) === "22"
                              ? "nd"
                              : iso.slice(8) === "03" || iso.slice(8) === "23"
                                ? "rd"
                                : "th"}
                        </div>
                        <div className="month-cell-body">
                          {hit ? (
                            <div className="month-event-line is-closure">
                              {hit.label}
                            </div>
                          ) : null}
                          {events.map((e) => (
                            <div key={e.id} className="month-event-line">
                              {e.title.replace(`${school.shortName}: `, "")}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <div
                    className="planner-cell month-cell month-notes-cell planner-lined"
                    data-label="Notes"
                  >
                    <PlannerInput
                      lined
                      multiline
                      rows={3}
                      value={note}
                      onChange={(v) => saveWeekNote(weekStart, v)}
                      placeholder="Notes…"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Sheet>
        </div>
      </div>
    </PlannerPageShell>
  );
}

/* ─── Planning (merged) ─── */

function PlanningWeeklySection({ school }: { school: School }) {
  const { data, patchData } = useStore();
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayISO()));
  const periods = school.periods.filter(
    (p) => p.kind === "lesson" || p.kind === "tutor" || p.kind === "break" || p.kind === "lunch",
  );

  useEffect(() => {
    setWeekStart(mondayOf(todayISO()));
  }, []);

  const weekEnd = addDays(weekStart, 4);
  const autoWeekLabel = `${weekStart.slice(8)}–${weekEnd.slice(8)} ${new Intl.DateTimeFormat(
    "en-GB",
    { month: "short" },
  ).format(new Date(Number(weekStart.slice(0, 4)), Number(weekStart.slice(5, 7)) - 1, 1))}`;

  const plan: WeeklyPlan =
    data.weeklyPlans.find(
      (w) => w.schoolId === school.id && w.weekStart === weekStart,
    ) ?? {
      id: uid("week"),
      schoolId: school.id,
      weekStart,
      term: "",
      weekLabel: "",
      cells: {},
      target: "",
      wentWell: "",
      todos: Array.from({ length: 5 }, (_, i) => ({
        id: `todo-${i}`,
        label: "",
        done: false,
      })),
    };

  function save(next: WeeklyPlan) {
    patchData((prev) => {
      const idx = prev.weeklyPlans.findIndex(
        (w) => w.schoolId === school.id && w.weekStart === next.weekStart,
      );
      if (idx >= 0) {
        const list = [...prev.weeklyPlans];
        list[idx] = { ...next, id: prev.weeklyPlans[idx]!.id };
        return { ...prev, weeklyPlans: list };
      }
      return { ...prev, weeklyPlans: [...prev.weeklyPlans, next] };
    });
  }

  const todos = Array.from({ length: 5 }, (_, i) => {
    const existing = plan.todos[i];
    return (
      existing ?? {
        id: `todo-${i}`,
        label: "",
        done: false,
      }
    );
  });

  function saveTodo(
    index: number,
    patch: Partial<(typeof todos)[number]>,
  ) {
    save({
      ...plan,
      todos: todos.map((t, j) => (j === index ? { ...t, ...patch } : t)),
    });
  }

  return (
    <section id="weekly" className="planner-block">
      <h2 className="planner-heading">Weekly plan</h2>
      <p className="planner-caption">Periods with break &amp; lunch · Monday to Friday · targets, reflection and to-dos.</p>
      <div className="planner-meta">
        <label>
          Term
          <input
            value={plan.term}
            onChange={(e) => save({ ...plan, term: e.target.value })}
          />
        </label>
        <label>
          Week
          <input
            value={plan.weekLabel || autoWeekLabel}
            onChange={(e) => save({ ...plan, weekLabel: e.target.value })}
          />
        </label>
        <button
          type="button"
          className="btn"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          ‹ Prev
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setWeekStart(mondayOf(todayISO()))}
        >
          This week
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          Next ›
        </button>
      </div>
      <div className="week-plan-layout">
        <div className="week-plan-main week-plan-scroll school-days-wrap">
          <Sheet className="week-plan-sheet">
            <div className="planner-bar week-days-bar">
              {DAY_NAMES.map((d, i) => {
                const iso = addDays(weekStart, i);
                const dayNum = Number(iso.slice(8));
                return (
                  <span key={d}>
                    {d.slice(0, 3)} {dayNum}
                    {dayNum === 1 || dayNum === 21 || dayNum === 31
                      ? "st"
                      : dayNum === 2 || dayNum === 22
                        ? "nd"
                        : dayNum === 3 || dayNum === 23
                          ? "rd"
                          : "th"}
                  </span>
                );
              })}
              <span>Weekend</span>
            </div>
            <div className="week-grid school-days-grid">
              {DAY_NAMES.map((d, di) => {
                const iso = addDays(weekStart, di);
                const dayNum = Number(iso.slice(8));
                const ordinal =
                  dayNum === 1 || dayNum === 21 || dayNum === 31
                    ? "st"
                    : dayNum === 2 || dayNum === 22
                      ? "nd"
                      : dayNum === 3 || dayNum === 23
                        ? "rd"
                        : "th";
                return (
                  <div
                    key={di}
                    className="week-col"
                    data-day={d}
                    data-label={`${d.slice(0, 3)} ${dayNum}${ordinal}`}
                  >
                    {periods.map((p) => {
                      const key = `${di + 1}-${p.id}`;
                      const isBand = p.kind === "break" || p.kind === "lunch";
                      return (
                        <div
                          key={key}
                          className={`week-period${isBand ? ` is-${p.kind}` : ""}`}
                        >
                          <PlannerInput
                            multiline={!isBand}
                            rows={isBand ? 1 : 2}
                            value={plan.cells[key] ?? ""}
                            placeholder={p.name}
                            onChange={(v) =>
                              save({
                                ...plan,
                                cells: { ...plan.cells, [key]: v },
                              })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div
                className="week-col week-col-weekend"
                data-day="Weekend"
                data-label="Weekend"
              >
                <div className="week-weekend-space">
                  <PlannerInput
                    multiline
                    rows={12}
                    value={plan.cells.weekend ?? ""}
                    placeholder="Weekend notes…"
                    onChange={(v) =>
                      save({
                        ...plan,
                        cells: { ...plan.cells, weekend: v },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </Sheet>
        </div>
        <div className="week-sidebar">
          <div className="week-side-block">
            <div className="planner-bar" style={{ display: "block" }}>
              This week&apos;s target
            </div>
            <PlannerInput
              multiline
              rows={5}
              value={plan.target}
              onChange={(v) => save({ ...plan, target: v })}
            />
          </div>
          <div className="week-side-block planner-lined">
            <div className="planner-bar" style={{ display: "block" }}>
              What went well?
            </div>
            <PlannerInput
              lined
              multiline
              rows={5}
              value={plan.wentWell}
              onChange={(v) => save({ ...plan, wentWell: v })}
            />
          </div>
          <div className="week-side-block week-todo-block">
            <div className="planner-bar" style={{ display: "block" }}>
              To do
            </div>
            <div className="week-todo-list">
              {todos.map((t, i) => (
                <label key={t.id}>
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => saveTodo(i, { done: !t.done })}
                  />
                  <textarea
                    className="planner-input"
                    rows={1}
                    value={t.label}
                    placeholder="Task…"
                    onChange={(e) => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = `${el.scrollHeight}px`;
                      saveTodo(i, { label: e.target.value });
                    }}
                    ref={(el) => {
                      if (!el) return;
                      el.style.height = "auto";
                      el.style.height = `${el.scrollHeight}px`;
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanningOverviewSection({ school }: { school: School }) {
  const { data, patchData } = useStore();
  const overview = data.placementOverviews.find((o) => o.schoolId === school.id) ?? {
    schoolId: school.id,
    term: school.academicYear,
    notes: "",
    weekHeaders: Array.from({ length: 10 }, () => ""),
    weekCells: {},
  };

  function save(next: typeof overview) {
    patchData((prev) => ({
      ...prev,
      placementOverviews: [
        ...prev.placementOverviews.filter((o) => o.schoolId !== school.id),
        next,
      ],
    }));
  }

  return (
    <section id="overview" className="planner-block">
      <div className="planner-meta">
        <label>
          Term
          <input
            value={overview.term}
            onChange={(e) => save({ ...overview, term: e.target.value })}
          />
        </label>
      </div>
      <div className="planner-stack">
        <div className="planner-x-scroll overview-scroll school-days-wrap">
        <Sheet className="overview-sheet">
          <div className="planner-bar overview-bar">
            <span>Week</span>
            {overview.weekHeaders.slice(0, 5).map((h, i) => (
              <span key={i}>
                <input
                  className="planner-input"
                  style={{ color: "#fff", textAlign: "center" }}
                  value={h}
                  placeholder={`Col ${i + 1}`}
                  onChange={(e) => {
                    const weekHeaders = [...overview.weekHeaders];
                    weekHeaders[i] = e.target.value;
                    save({ ...overview, weekHeaders });
                  }}
                />
              </span>
            ))}
          </div>
          <div className="planner-grid joined overview-grid">
            {Array.from({ length: 7 }, (_, wi) => (
              <div key={wi} className="planner-row overview-row">
                <div className="planner-label-cell">Week {wi + 1}</div>
                {Array.from({ length: 5 }, (_, ci) => {
                  const key = `${wi}-${ci}`;
                  return (
                    <div
                      key={key}
                      className="planner-cell"
                      data-label={overview.weekHeaders[ci]?.trim() || `Col ${ci + 1}`}
                    >
                      <PlannerInput
                        value={overview.weekCells[key] ?? ""}
                        onChange={(v) =>
                          save({
                            ...overview,
                            weekCells: { ...overview.weekCells, [key]: v },
                          })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Sheet>
        </div>
        <PlannerNoteBox
          name={`overview-notes-${school.id}`}
          label="Flexible planning ideas"
          value={overview.notes}
          onChange={(v) => save({ ...overview, notes: v })}
        />
      </div>
    </section>
  );
}

function PlanningTimetableSection({ school }: { school: School }) {
  const { data, patchData, addTimetableSlot } = useStore();
  const slots = data.timetable.filter((t) => t.schoolId === school.id);
  const periods = school.periods.filter(
    (p) =>
      p.kind === "lesson" ||
      p.kind === "tutor" ||
      p.kind === "break" ||
      p.kind === "lunch",
  );
  function cell(day: number, periodId: string) {
    return slots.find((s) => s.day === day && s.periodId === periodId);
  }

  return (
    <section id="timetable" className="planner-block">
      <div className="school-days-wrap timetable-scroll">
        <Sheet className="timetable-sheet">
          <div className="planner-bar timetable-bar">
            <span>Period</span>
            <span>Times</span>
            {DAY_NAMES.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="planner-grid joined">
            {periods.map((p) => {
              const isBand = p.kind === "break" || p.kind === "lunch";
              return (
                <div
                  key={p.id}
                  className={`planner-row timetable-row${isBand ? ` is-${p.kind}` : ""}`}
                >
                  <div className="planner-label-cell">{p.name}</div>
                  <div className="planner-cell timetable-time-cell">
                    {p.start}–{p.end}
                  </div>
                  {([1, 2, 3, 4, 5] as const).map((day) => {
                    const existing = cell(day, p.id);
                    return (
                      <div
                        key={day}
                        className="planner-cell timetable-day-cell"
                        data-label={DAY_NAMES[day - 1]}
                      >
                        <PlannerInput
                          value={existing?.className ?? ""}
                          placeholder={isBand ? p.name : "Class"}
                          onChange={(v) => {
                            if (existing) {
                              patchData((prev) => ({
                                ...prev,
                                timetable: prev.timetable.map((t) =>
                                  t.id === existing.id ? { ...t, className: v } : t,
                                ),
                              }));
                            } else if (v.trim()) {
                              addTimetableSlot({
                                schoolId: school.id,
                                day,
                                periodId: p.id,
                                className: v,
                              });
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </Sheet>
      </div>
    </section>
  );
}

function GroupsBoard({ school }: { school: School }) {
  const { data, patchData } = useStore();

  function cell(block: number, row: number, col: number) {
    return data.seating.find(
      (s) =>
        s.schoolId === school.id &&
        s.block === block &&
        s.row === row &&
        s.col === col,
    );
  }

  function setCell(block: number, row: number, col: number, text: string) {
    patchData((prev) => {
      const existing = prev.seating.find(
        (s) =>
          s.schoolId === school.id &&
          s.block === block &&
          s.row === row &&
          s.col === col,
      );
      if (existing) {
        return {
          ...prev,
          seating: prev.seating.map((s) =>
            s.id === existing.id ? { ...s, text } : s,
          ),
        };
      }
      return {
        ...prev,
        seating: [
          ...prev.seating,
          { id: uid("seat"), schoolId: school.id, block, row, col, text },
        ],
      };
    });
  }

  return (
    <div className="groups-board">
      {[0, 1, 2].map((block) => (
        <div key={block} className="group-col">
          <div className="group-cell is-head">Group {block + 1}</div>
          {Array.from({ length: 8 }, (_, row) => (
            <div key={row} className="group-cell">
              <PlannerInput
                value={cell(block, row, 0)?.text ?? ""}
                onChange={(v) => setCell(block, row, 0, v)}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PlanningResourcesSection({ school }: { school: School }) {
  const { data, patchData } = useStore();
  const pack: PlanningResources =
    data.planningResources.find((p) => p.schoolId === school.id) ?? {
      schoolId: school.id,
      planningTime: "",
      staffMeetings: "",
      mentorMeetings: "",
      schemes: "",
      planningAidWebsites: "",
      onlineTools: "",
      staffExpertise: "",
      otherResources: "",
      learningNeeds: "",
    };

  function save(next: PlanningResources) {
    patchData((prev) => ({
      ...prev,
      planningResources: [
        ...prev.planningResources.filter((p) => p.schoolId !== school.id),
        next,
      ],
    }));
  }

  return (
    <section id="resources" className="planner-block">
      <h2 className="planner-heading">Planning Resources</h2>
      <p className="planner-caption">Keep a record of important things for planning and teaching on placement.</p>
      <div className="planner-stack">
        <div className="planner-block">
          <div className="planner-banner">My Time</div>
          <div className="planner-grid">
            {(
              [
                ["PLANNING TIME", "planningTime"],
                ["STAFF MEETINGS", "staffMeetings"],
                ["MENTOR MEETINGS", "mentorMeetings"],
              ] as const
            ).map(([label, key]) => (
              <LabelRow key={key} label={label}>
                <PlannerInput
                  value={pack[key]}
                  onChange={(v) => save({ ...pack, [key]: v })}
                />
              </LabelRow>
            ))}
          </div>
        </div>
        <div className="planner-block">
          <div className="planner-banner">Planning Resources</div>
          <div className="planner-grid">
            {(
              [
                ["SCHEMES", "schemes"],
                ["PLANNING AID WEBSITES", "planningAidWebsites"],
                ["ONLINE TEACHING TOOLS", "onlineTools"],
                ["STAFF WITH EXPERTISE", "staffExpertise"],
                ["OTHER RESOURCES", "otherResources"],
              ] as const
            ).map(([label, key]) => (
              <LabelRow key={key} label={label}>
                <PlannerInput
                  multiline
                  value={pack[key]}
                  onChange={(v) => save({ ...pack, [key]: v })}
                />
              </LabelRow>
            ))}
          </div>
        </div>
        <div className="planner-block">
          <div className="planner-banner">Considerations</div>
          <LabelRow label="Learning needs to consider when planning">
            <PlannerInput
              multiline
              rows={5}
              value={pack.learningNeeds}
              onChange={(v) => save({ ...pack, learningNeeds: v })}
            />
          </LabelRow>
        </div>
      </div>
    </section>
  );
}

export function SchoolPlanningPage() {
  const school = useSchool();
  useSectionHash();

  return (
    <PlannerPageShell
      school={school}
      section="Planning"
      title="Planning"
      caption="Weekly plans and planning resources — jump to a section below."
      backTo={`/school/${school.id}`}
      backLabel="Home"
    >
      <div style={{ gridColumn: "1 / -1" }}>
        <JumpTiles
          items={[
            { id: "weekly", label: "Weekly", blurb: "This week" },
            { id: "resources", label: "Resources", blurb: "Schemes" },
          ]}
        />
        <div className="planner-stack">
          <PlanningWeeklySection school={school} />
          <PlanningResourcesSection school={school} />
        </div>
      </div>
    </PlannerPageShell>
  );
}

export function SchoolWeeklyPage() {
  return <PlanningRedirect hash="weekly" />;
}
export function SchoolOverviewPage() {
  const school = useSchool();
  return (
    <PlannerPageShell
      school={school}
      section="Planning"
      title="My Placement Overview"
      caption="Medium term plan — overview by subject, class, topic or day."
      backTo={`/school/${school.id}/planning`}
      backLabel="Planning"
    >
      <div style={{ gridColumn: "1 / -1" }}>
        <PlanningOverviewSection school={school} />
      </div>
    </PlannerPageShell>
  );
}
export function SchoolTimetableSpreadPage() {
  const school = useSchool();
  return (
    <PlannerPageShell
      school={school}
      section="Timetable"
      title="Timetable"
      caption="Weekly teaching slots — periods, times and classes."
      backTo={`/school/${school.id}`}
      backLabel="Home"
    >
      <div style={{ gridColumn: "1 / -1" }}>
        <PlanningTimetableSection school={school} />
      </div>
    </PlannerPageShell>
  );
}
export function SchoolSeatingPage() {
  const school = useSchool();
  return <Navigate to={`/school/${school.id}/groups`} replace />;
}

export function SchoolClassHubPage() {
  const school = useSchool();
  const base = `/school/${school.id}`;

  return (
    <PlannerPageShell
      school={school}
      section="Class"
      title="Class"
      caption="Student notes and groups — open a sheet below."
      backTo={`/school/${school.id}`}
      backLabel="Home"
    >
      <div style={{ gridColumn: "1 / -1" }}>
        <JumpTiles
          items={[
            {
              id: "students",
              label: "Student notes",
              blurb: "Lined sheet",
              href: `${base}/students`,
            },
            {
              id: "groups",
              label: "Groups",
              blurb: "Three columns",
              href: `${base}/groups`,
            },
          ]}
        />
      </div>
    </PlannerPageShell>
  );
}

/* ─── Notes hub ─── */

export function SchoolNotesHubPage() {
  const school = useSchool();
  const base = `/school/${school.id}`;

  return (
    <PlannerPageShell
      school={school}
      section="Notes"
      title="Notes"
      caption="Open a mentor meeting, observation, or classroom practice sheet."
      backTo={`/school/${school.id}`}
      backLabel="Home"
    >
      <div className="notes-preview-grid" style={{ gridColumn: "1 / -1" }}>
        <Link to={`${base}/mentor`} className="notes-preview-card">
          <h3>Mentor meeting</h3>
          <div className="notes-preview-mini mentor-mini">
            <div className="mini-head">
              <span className="mini-script">Mentor notes</span>
              <span className="mini-meta">Date · Focus</span>
            </div>
            <div className="mini-lined" />
            <div className="mini-foot">
              <div className="mini-box">Priorities</div>
              <div className="mini-foot-right">
                <div className="mini-box">Positive</div>
                <div className="mini-box">Next date</div>
              </div>
            </div>
          </div>
        </Link>
        <Link to={`${base}/observing`} className="notes-preview-card">
          <h3>Observation of others</h3>
          <div className="notes-preview-mini">
            <div className="mini-bar">Observing</div>
            <div className="mini-box">Focus · Outline</div>
            <div className="mini-box">Went well / Impact</div>
            <div className="mini-box">Develop 1 · 2 · 3</div>
          </div>
        </Link>
        <Link to={`${base}/classroom-practice`} className="notes-preview-card">
          <h3>Classroom practice</h3>
          <div className="notes-preview-mini practice-mini">
            <div className="mini-head">
              <span className="mini-script">Practice</span>
              <span className="mini-badge">Notes</span>
            </div>
            <div className="mini-dots" />
          </div>
        </Link>
      </div>
    </PlannerPageShell>
  );
}

/* ─── Meeting sheets ─── */

function useMeetingNotes(kind: MeetingNote["kind"]) {
  const school = useSchool();
  const { data, patchData } = useStore();
  const notes = data.meetingNotes
    .filter((n) => n.schoolId === school.id && n.kind === kind)
    .sort((a, b) => b.date.localeCompare(a.date));
  const [activeId, setActiveId] = useState(notes[0]?.id ?? "");

  const blank: MeetingNote = {
    id: uid("meet"),
    schoolId: school.id,
    kind,
    date: todayISO(),
    observed: "",
    focus: "",
    subjectYear: "",
    outline: "",
    wentWell: "",
    impact: "",
    develop1: "",
    develop2: "",
    develop3: "",
    body: "",
    nextMeetingDate: "",
  };

  const saved = notes.find((n) => n.id === activeId) ?? notes[0];
  const active = saved ?? blank;
  const isSaved = notes.some((n) => n.id === active.id);

  function save(next: MeetingNote) {
    patchData((prev) => {
      const exists = prev.meetingNotes.some((n) => n.id === next.id);
      return {
        ...prev,
        meetingNotes: exists
          ? prev.meetingNotes.map((n) => (n.id === next.id ? next : n))
          : [...prev.meetingNotes, next],
      };
    });
    setActiveId(next.id);
  }

  function remove(id: string) {
    const remaining = notes.filter((n) => n.id !== id);
    patchData((prev) => ({
      ...prev,
      meetingNotes: prev.meetingNotes.filter((n) => n.id !== id),
    }));
    setActiveId(remaining[0]?.id ?? "");
  }

  function newSheet() {
    save({ ...blank, id: uid("meet") });
  }

  return { school, notes, active, isSaved, save, remove, newSheet, setActiveId };
}

function MentorMeetingSheet() {
  const { school, notes, active, isSaved, save, remove, newSheet, setActiveId } =
    useMeetingNotes("mentor");
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <PlannerPageShell
      school={school}
      section="Notes"
      title="Mentor meeting notes"
      caption="Lined meeting notes with priorities, a positive takeaway, and the next date."
      backTo={`/school/${school.id}/notes`}
      backLabel="Notes"
    >
      <div style={{ gridColumn: "1 / -1" }}>
        <div className="planner-meta">
          <button type="button" className="btn" onClick={newSheet}>
            + New sheet
          </button>
          {notes.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`btn${n.id === active.id ? " is-active-soft" : ""}`}
              onClick={() => setActiveId(n.id)}
            >
              {n.date}
            </button>
          ))}
          {isSaved ? (
            <button
              type="button"
              className="btn btn-peach"
              onClick={() => setConfirmDelete(true)}
            >
              Delete meeting
            </button>
          ) : null}
        </div>

        <div className="mentor-sheet">
          <div className="mentor-sheet-top">
            <h2 className="mentor-sheet-title">Mentor meeting notes</h2>
            <div className="mentor-meta-table">
              <div className="planner-bar soft mentor-meta-bar">
                <span>Date</span>
                <span>Focus</span>
              </div>
              <div className="planner-row mentor-meta-row">
                <div className="planner-cell">
                  <input
                    className="planner-input"
                    type="date"
                    value={active.date}
                    onChange={(e) => save({ ...active, date: e.target.value })}
                  />
                </div>
                <div className="planner-cell">
                  <PlannerInput
                    value={active.focus}
                    onChange={(v) => save({ ...active, focus: v })}
                    placeholder="Meeting focus…"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mentor-notes-area planner-lined">
            <PlannerInput
              lined
              multiline
              rows={14}
              value={active.body}
              onChange={(v) => save({ ...active, body: v })}
              placeholder="Write meeting notes…"
            />
          </div>

          <div className="mentor-sheet-foot">
            <div className="mentor-priorities">
              <div className="planner-bar soft" style={{ display: "block" }}>
                My top three priorities
              </div>
              {(["develop1", "develop2", "develop3"] as const).map((key, i) => (
                <div key={key} className="mentor-priority-row">
                  <span className="mentor-priority-num">{i + 1}</span>
                  <PlannerInput
                    lined
                    multiline
                    rows={2}
                    value={active[key]}
                    onChange={(v) => save({ ...active, [key]: v })}
                  />
                </div>
              ))}
            </div>
            <div className="mentor-foot-right">
              <div className="obs-box">
                <div className="planner-bar soft" style={{ display: "block" }}>
                  Positive point to take from the meeting
                </div>
                <div className="planner-lined">
                  <PlannerInput
                    lined
                    multiline
                    rows={5}
                    value={active.wentWell}
                    onChange={(v) => save({ ...active, wentWell: v })}
                  />
                </div>
              </div>
              <div className="obs-box">
                <div className="planner-bar soft" style={{ display: "block" }}>
                  Next meeting date
                </div>
                <input
                  className="planner-input"
                  type="date"
                  value={active.nextMeetingDate ?? ""}
                  onChange={(e) =>
                    save({ ...active, nextMeetingDate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete mentor meeting?"
        message={`This will permanently remove the meeting sheet${
          active.date ? ` from ${active.date}` : ""
        }${active.focus ? ` (“${active.focus}”)` : ""}. This can’t be undone.`}
        confirmLabel="Delete meeting"
        danger
        onConfirm={() => remove(active.id)}
        onClose={() => setConfirmDelete(false)}
      />
    </PlannerPageShell>
  );
}

function MeetingSheet({
  kind,
  title,
}: {
  kind: MeetingNote["kind"];
  title: string;
}) {
  const { school, notes, active, isSaved, save, remove, newSheet, setActiveId } =
    useMeetingNotes(kind);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <PlannerPageShell
      school={school}
      section="Notes"
      title={title}
      caption="Observation notes — write on the sheet, not in a popup."
      backTo={`/school/${school.id}/notes`}
      backLabel="Notes"
    >
      <div style={{ gridColumn: "1 / -1" }}>
        <div className="planner-meta">
          <button type="button" className="btn" onClick={newSheet}>
            + New sheet
          </button>
          {notes.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`btn${n.id === active.id ? " is-active-soft" : ""}`}
              onClick={() => setActiveId(n.id)}
            >
              {n.date}
            </button>
          ))}
          {isSaved ? (
            <button
              type="button"
              className="btn btn-peach"
              onClick={() => setConfirmDelete(true)}
            >
              Delete observation
            </button>
          ) : null}
        </div>
        <div className="obs-layout">
          <div className="planner-meta">
            <label>
              Date
              <input
                type="date"
                value={active.date}
                onChange={(e) => save({ ...active, date: e.target.value })}
              />
            </label>
            <label>
              Observed :
              <input
                value={active.observed}
                onChange={(e) => save({ ...active, observed: e.target.value })}
              />
            </label>
          </div>
          <div className="obs-mid">
            <div className="obs-box">
              <div className="planner-label-cell">Focus of observation</div>
              <PlannerInput
                multiline
                value={active.focus}
                onChange={(v) => save({ ...active, focus: v })}
              />
              <div className="planner-label-cell">Subject / year group</div>
              <PlannerInput
                value={active.subjectYear}
                onChange={(v) => save({ ...active, subjectYear: v })}
              />
            </div>
            <div className="obs-box">
              <div className="planner-label-cell">Lesson outline</div>
              <PlannerInput
                multiline
                rows={6}
                value={active.outline}
                onChange={(v) => save({ ...active, outline: v })}
              />
            </div>
          </div>
          <div className="obs-pair">
            <div className="obs-box planner-lined">
              <div className="planner-label-cell">What went well?</div>
              <PlannerInput
                lined
                multiline
                rows={8}
                value={active.wentWell}
                onChange={(v) => save({ ...active, wentWell: v })}
              />
            </div>
            <div className="obs-box planner-lined">
              <div className="planner-label-cell">What was the impact?</div>
              <PlannerInput
                lined
                multiline
                rows={8}
                value={active.impact}
                onChange={(v) => save({ ...active, impact: v })}
              />
            </div>
          </div>
          <h2 className="planner-section-title">Top three points for development</h2>
          <div className="obs-develop">
            {(["develop1", "develop2", "develop3"] as const).map((key, i) => (
              <div key={key} className="obs-box">
                <div className="planner-label-cell">{i + 1}</div>
                <PlannerInput
                  multiline
                  rows={4}
                  value={active[key]}
                  onChange={(v) => save({ ...active, [key]: v })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete observation notes?"
        message={`This will permanently remove the observation sheet${
          active.date ? ` from ${active.date}` : ""
        }${active.focus ? ` (“${active.focus}”)` : ""}. This can’t be undone.`}
        confirmLabel="Delete observation"
        danger
        onConfirm={() => remove(active.id)}
        onClose={() => setConfirmDelete(false)}
      />
    </PlannerPageShell>
  );
}

export function SchoolMentorPage() {
  return <MentorMeetingSheet />;
}
export function SchoolObservedPage() {
  const school = useSchool();
  return <Navigate to={`/school/${school.id}/notes`} replace />;
}
export function SchoolObservingPage() {
  return <MeetingSheet kind="observing" title="Observation of others" />;
}

export function SchoolClassroomPracticePage() {
  const school = useSchool();
  const { data, patchData } = useStore();
  const existing = (data.classroomPracticeNotes ?? []).find(
    (n) => n.schoolId === school.id,
  );
  const note = existing ?? {
    id: uid("practice"),
    schoolId: school.id,
    standardLabel: "Standard 4 – ‘Plan and teach well structured lessons’",
    body: "",
  };
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  function save(next: typeof note) {
    patchData((prev) => {
      const list = prev.classroomPracticeNotes ?? [];
      const exists = list.some((n) => n.schoolId === school.id);
      return {
        ...prev,
        classroomPracticeNotes: exists
          ? list.map((n) => (n.schoolId === school.id ? { ...next, id: n.id } : n))
          : [...list, next],
      };
    });
  }

  function syncHeight(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    const min = Math.max(el.parentElement?.clientHeight ?? 0, 28 * 16);
    el.style.height = `${Math.max(el.scrollHeight, min)}px`;
  }

  useEffect(() => {
    syncHeight(areaRef.current);
  }, [note.body]);

  useEffect(() => {
    const onResize = () => syncHeight(areaRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <PlannerPageShell
      school={school}
      section="Notes"
      title="Classroom practice"
      caption={
        note.standardLabel ||
        "Standard 4 – ‘Plan and teach well structured lessons’"
      }
      backTo={`/school/${school.id}/notes`}
      backLabel="Notes"
    >
      <div className="practice-sheet" style={{ gridColumn: "1 / -1" }}>
        <div className="practice-dot-page">
          <textarea
            ref={areaRef}
            className="practice-dot-input"
            value={note.body}
            placeholder="Write on the dots…"
            spellCheck
            onChange={(e) => {
              save({ ...note, body: e.target.value });
              syncHeight(e.target);
            }}
          />
        </div>
      </div>
    </PlannerPageShell>
  );
}

/* ─── Records ─── */

function StudentBlankRow({
  schoolId,
  onCreated,
}: {
  schoolId: string;
  onCreated: (id: string) => void;
}) {
  const { patchData, updateStudent } = useStore();
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  function ensure(patch: { name?: string; notes?: string }) {
    const nextName = patch.name !== undefined ? patch.name : name;
    const nextNotes = patch.notes !== undefined ? patch.notes : notes;
    if (patch.name !== undefined) setName(patch.name);
    if (patch.notes !== undefined) setNotes(patch.notes);

    if (createdId) {
      updateStudent(createdId, {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      });
      return;
    }
    if (!nextName.trim() && !nextNotes.trim()) return;
    const id = uid("stu");
    patchData((prev) => ({
      ...prev,
      students: [
        ...prev.students,
        { id, schoolId, name: nextName, notes: nextNotes },
      ],
    }));
    setCreatedId(id);
    onCreated(id);
  }

  return (
    <div className="planner-row">
      <div className="planner-cell">
        <PlannerInput
          value={name}
          placeholder="Student name"
          onChange={(v) => ensure({ name: v })}
        />
      </div>
      <div className="planner-cell planner-lined">
        <PlannerInput
          lined
          multiline
          rows={2}
          value={notes}
          onChange={(v) => ensure({ notes: v })}
        />
      </div>
    </div>
  );
}

export function SchoolStudentsNotesPage() {
  const school = useSchool();
  const { data, updateStudent } = useStore();
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [blankCount, setBlankCount] = useState(3);
  const students = data.students
    .filter((s) => s.schoolId === school.id && !draftIds.includes(s.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <PlannerPageShell
      school={school}
      section="Class"
      title="Student Notes"
      caption="Lined name · notes sheet — type directly on the page."
      backTo={`/school/${school.id}/class`}
      backLabel="Class"
    >
      <div>
        <Sheet className="stackable-table student-notes-sheet">
          <div className="planner-bar soft student-notes-bar">
            <span>Name</span>
            <span>Notes</span>
          </div>
          <div className="planner-grid joined student-notes-table">
            {students.map((s) => (
              <div key={s.id} className="planner-row student-notes-row">
                <div className="planner-cell" data-label="Name">
                  <PlannerInput
                    value={s.name}
                    onChange={(v) => updateStudent(s.id, { name: v })}
                  />
                </div>
                <div className="planner-cell planner-lined" data-label="Notes">
                  <PlannerInput
                    lined
                    multiline
                    rows={2}
                    value={s.notes ?? ""}
                    onChange={(v) => updateStudent(s.id, { notes: v })}
                  />
                </div>
              </div>
            ))}
            {Array.from({ length: blankCount }, (_, i) => (
              <StudentBlankRow
                key={`blank-${i}`}
                schoolId={school.id}
                onCreated={(id) =>
                  setDraftIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
                }
              />
            ))}
          </div>
        </Sheet>
        <button
          type="button"
          className="btn"
          style={{ marginTop: "0.75rem" }}
          onClick={() => setBlankCount((n) => n + 1)}
        >
          + Add row
        </button>
      </div>
    </PlannerPageShell>
  );
}

export function SchoolGroupsPage() {
  const school = useSchool();
  return (
    <PlannerPageShell
      school={school}
      section="Class"
      title="Groups"
      caption="Three-column group / seating planner."
      backTo={`/school/${school.id}/class`}
      backLabel="Class"
    >
      <GroupsBoard school={school} />
    </PlannerPageShell>
  );
}

export function SchoolRecordsTrackersPage() {
  const school = useSchool();
  const { data, upsertAttendance, addBehaviour, addGrade, addHomework, toggleHomework, deleteHomework } =
    useStore();
  const students = data.students.filter((s) => s.schoolId === school.id);
  const [date, setDate] = useState(todayISO());
  const [behTitle, setBehTitle] = useState("");
  const [behStudent, setBehStudent] = useState("");
  const [behDetail, setBehDetail] = useState("");
  useSectionHash();

  return (
    <PlannerPageShell
      school={school}
      section="Records"
      title="Records"
      caption="Attendance, behaviour log, grades and homework."
      double
      backTo={`/school/${school.id}`}
      backLabel="Home"
    >
      <div style={{ gridColumn: "1 / -1" }}>
        <JumpTiles
          items={[
            { id: "attendance", label: "Attendance", blurb: "Daily marks" },
            { id: "behaviour", label: "Behaviour", blurb: "Log" },
            { id: "grades", label: "Grades", blurb: "Scores" },
            { id: "homework", label: "Homework", blurb: "Due" },
          ]}
        />
      </div>
      <div className="planner-stack">
        <section id="attendance" className="planner-block">
          <h2 className="planner-heading">Attendance</h2>
          <div className="planner-meta">
            <label>
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          <Sheet>
            <div className="planner-grid">
              {students.length === 0 ? (
                <p className="muted" style={{ padding: "0.75rem" }}>
                  Add students on the{" "}
                  <Link to={`/school/${school.id}/students`}>Student Notes</Link> page.
                </p>
              ) : (
                students.map((s) => {
                  const mark =
                    data.attendance.find(
                      (a) =>
                        a.schoolId === school.id &&
                        a.studentId === s.id &&
                        a.date === date,
                    )?.mark ?? "";
                  return (
                    <div
                      key={s.id}
                      className="planner-row"
                      style={{ gridTemplateColumns: "1fr 8rem" }}
                    >
                      <div className="planner-cell planner-write">{s.name}</div>
                      <div className="planner-cell">
                        <PlannerSelect
                          value={mark}
                          onChange={(v) => {
                            if (!v) return;
                            upsertAttendance({
                              schoolId: school.id,
                              studentId: s.id,
                              date,
                              mark: v as "present" | "absent" | "late" | "authorised",
                            });
                          }}
                        >
                          <option value="">—</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="authorised">Authorised</option>
                        </PlannerSelect>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Sheet>
        </section>

        <section id="behaviour" className="planner-block">
          <h2 className="planner-heading">Behaviour log</h2>
          <div className="planner-grid">
            <LabelRow label="Student">
              <PlannerSelect value={behStudent} onChange={setBehStudent}>
                <option value="">Whole class / none</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </PlannerSelect>
            </LabelRow>
            <LabelRow label="Title">
              <PlannerInput value={behTitle} onChange={setBehTitle} />
            </LabelRow>
            <LabelRow label="Detail">
              <PlannerInput multiline value={behDetail} onChange={setBehDetail} />
            </LabelRow>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-clay"
            style={{ margin: "0.5rem 0 0" }}
            onClick={() => {
              if (!behTitle.trim()) return;
              addBehaviour({
                schoolId: school.id,
                studentId: behStudent || undefined,
                title: behTitle,
                date: todayISO(),
                detail: behDetail || undefined,
              });
              setBehTitle("");
              setBehDetail("");
            }}
          >
            Add entry
          </button>
          <Sheet>
            <div className="planner-grid">
              {data.behaviour
                .filter((b) => b.schoolId === school.id)
                .slice(0, 12)
                .map((b) => (
                  <div
                    key={b.id}
                    className="planner-row"
                    style={{ gridTemplateColumns: "5.5rem 1fr" }}
                  >
                    <div className="planner-label-cell">{b.date.slice(5)}</div>
                    <div className="planner-cell planner-write">
                      <strong>{b.title}</strong>
                      {b.detail ? <div className="hint">{b.detail}</div> : null}
                    </div>
                  </div>
                ))}
            </div>
          </Sheet>
        </section>
      </div>

      <div className="planner-stack">
        <section id="grades" className="planner-block">
          <h2 className="planner-heading">Grades</h2>
          <GradesInline schoolId={school.id} students={students} addGrade={addGrade} grades={data.grades} />
        </section>
        <section id="homework" className="planner-block">
          <h2 className="planner-heading">Homework</h2>
          <Sheet>
            <div className="planner-grid homework-table">
              {data.homework
                .filter((h) => h.schoolId === school.id)
                .map((h) => (
                  <div key={h.id} className="planner-row homework-row">
                    <div className="planner-cell homework-check-cell">
                      <input
                        type="checkbox"
                        checked={h.done}
                        onChange={() => toggleHomework(h.id)}
                        aria-label={h.done ? "Mark incomplete" : "Mark complete"}
                      />
                      <button
                        type="button"
                        className="homework-delete-btn"
                        aria-label={`Delete ${h.title}`}
                        title="Delete homework"
                        onClick={() => deleteHomework(h.id)}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                    <div className="planner-cell planner-write">{h.title}</div>
                    <div className="planner-cell planner-write homework-date-cell">
                      {h.dueDate}
                    </div>
                  </div>
                ))}
            </div>
          </Sheet>
          <HomeworkAdd schoolId={school.id} addHomework={addHomework} />
        </section>
      </div>
    </PlannerPageShell>
  );
}

function GradesInline({
  schoolId,
  students,
  grades,
  addGrade,
}: {
  schoolId: string;
  students: { id: string; name: string }[];
  grades: { id: string; schoolId: string; studentId: string; title: string; score?: string; date: string }[];
  addGrade: (input: {
    schoolId: string;
    studentId: string;
    title: string;
    score?: string;
    date: string;
  }) => void;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [score, setScore] = useState("");
  return (
    <div className="planner-stack">
      <div className="planner-grid">
        <LabelRow label="Student">
          <PlannerSelect value={studentId} onChange={setStudentId}>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </PlannerSelect>
        </LabelRow>
        <LabelRow label="Assessment">
          <PlannerInput value={title} onChange={setTitle} />
        </LabelRow>
        <LabelRow label="Score">
          <PlannerInput value={score} onChange={setScore} />
        </LabelRow>
      </div>
      <button
        type="button"
        className="btn"
        onClick={() => {
          if (!title.trim() || !studentId) return;
          addGrade({
            schoolId,
            studentId,
            title,
            score: score || undefined,
            date: todayISO(),
          });
          setTitle("");
          setScore("");
        }}
      >
        Add grade
      </button>
      <Sheet>
        <div className="planner-grid">
          {grades
            .filter((g) => g.schoolId === schoolId)
            .slice(0, 10)
            .map((g) => {
              const s = students.find((x) => x.id === g.studentId);
              return (
                <div
                  key={g.id}
                  className="planner-row"
                  style={{ gridTemplateColumns: "5.5rem 1fr" }}
                >
                  <div className="planner-label-cell">{g.date.slice(5)}</div>
                  <div className="planner-cell planner-write">
                    {s?.name} · {g.title}
                    {g.score ? ` · ${g.score}` : ""}
                  </div>
                </div>
              );
            })}
        </div>
      </Sheet>
    </div>
  );
}

function HomeworkAdd({
  schoolId,
  addHomework,
}: {
  schoolId: string;
  addHomework: (input: { schoolId: string; title: string; dueDate: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(todayISO());
  return (
    <div className="planner-meta">
      <PlannerInput value={title} onChange={setTitle} placeholder="Homework title" />
      <input
        type="date"
        className="planner-input"
        value={due}
        onChange={(e) => setDue(e.target.value)}
      />
      <button
        type="button"
        className="btn"
        onClick={() => {
          if (!title.trim()) return;
          addHomework({ schoolId, title, dueDate: due });
          setTitle("");
        }}
      >
        Add homework
      </button>
    </div>
  );
}
