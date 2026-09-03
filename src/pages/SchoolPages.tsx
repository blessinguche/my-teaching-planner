import { useMemo, useState, type ReactNode } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AddButton, AddDialog, PageHeader } from "../components/AddDialog";
import { todayISO } from "../data/dates";
import { formatShortDate, useStore } from "../data/store";
import type { AttendanceMark, School } from "../data/types";

type SchoolCtx = { school: School };

function useSchool() {
  return useOutletContext<SchoolCtx>().school;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

export function SchoolHomePage() {
  const school = useSchool();
  const { data } = useStore();
  const base = `/school/${school.id}`;
  const studentCount = data.students.filter((s) => s.schoolId === school.id).length;
  const openTodos = data.schoolTodos.filter(
    (t) => t.schoolId === school.id && !t.done,
  ).length;
  const nextTerm = [...school.terms]
    .filter((t) => t.end >= todayISO())
    .sort((a, b) => a.start.localeCompare(b.start))[0];

  const shortcuts = [
    ["Terms & holidays", `${base}/terms`],
    ["Day times / timetable", `${base}/timetable`],
    ["Lesson plans", `${base}/lessons`],
    ["Class roster", `${base}/roster`],
    ["Attendance", `${base}/attendance`],
    ["Grades", `${base}/grades`],
    ["Behaviour", `${base}/behaviour`],
    ["Homework", `${base}/homework`],
    ["Parent comms", `${base}/comms`],
    ["Contacts", `${base}/contacts`],
    ["To-dos", `${base}/todos`],
    ["Goals", `${base}/goals`],
    ["Professional development", `${base}/pd`],
    ["Supplies", `${base}/supplies`],
    ["Projects", `${base}/projects`],
    ["Birthdays & dates", `${base}/birthdays`],
  ] as const;

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow={school.academicYear}
        title={school.name}
        blurb="Teaching planner for this school — lessons, students, and day-to-day classroom admin."
      />
      <div className="hub-jump-row" style={{ marginBottom: "1rem" }}>
        <span className="clay-chip">{studentCount} students</span>
        <span className="clay-chip">{openTodos} open to-dos</span>
        {nextTerm ? (
          <span className="clay-chip">
            {nextTerm.name} · from {formatShortDate(nextTerm.start)}
          </span>
        ) : null}
      </div>
      {school.startNotes ? (
        <section className="panel clay-panel" style={{ marginBottom: "1rem" }}>
          <h2 className="panel-title">Start of term</h2>
          <p className="muted">{school.startNotes}</p>
        </section>
      ) : null}
      <div className="school-shortcut-grid">
        {shortcuts.map(([label, to]) => (
          <Link key={to} to={to} className="panel school-shortcut">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SchoolTermsPage() {
  const school = useSchool();
  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow={school.shortName}
        title="Terms & holidays"
        blurb="Academic year segments, INSET days, and holidays."
      />
      <section className="panel clay-panel" style={{ marginBottom: "1rem" }}>
        <h2 className="panel-title">Terms</h2>
        {school.terms.length === 0 ? (
          <p className="muted">No terms yet.</p>
        ) : (
          <ul>
            {school.terms.map((t) => (
              <li key={t.id} className="upcoming-item">
                <span className="time-pill">{formatShortDate(t.start)}</span>
                <div>
                  <strong>{t.name}</strong>
                  <p className="hint">
                    {formatShortDate(t.start)} – {formatShortDate(t.end)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel clay-panel">
        <h2 className="panel-title">Closures</h2>
        <ul>
          {school.closures.map((c) => (
            <li key={c.id} className="upcoming-item">
              <span className={`time-pill${c.kind === "inset" ? " deadline" : " break"}`}>
                {c.kind.toUpperCase()}
              </span>
              <div>
                <strong>{c.label}</strong>
                <p className="hint">
                  {formatShortDate(c.start)}
                  {c.end !== c.start ? ` – ${formatShortDate(c.end)}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function SchoolTimetablePage() {
  const school = useSchool();
  const { data, addTimetableSlot } = useStore();
  const [open, setOpen] = useState(false);
  const slots = data.timetable.filter((t) => t.schoolId === school.id);

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow={school.shortName}
        title="Day times & timetable"
        blurb="Period structure for the school day, plus your weekly teaching slots."
        actions={<AddButton label="Slot" onClick={() => setOpen(true)} />}
      />
      <section className="panel clay-panel" style={{ marginBottom: "1rem" }}>
        <h2 className="panel-title">School day</h2>
        <ul>
          {school.periods.map((p) => (
            <li key={p.id} className="timeline-item">
              <span className="time-pill">
                {p.start}–{p.end}
              </span>
              <div>
                <strong>{p.name}</strong>
                <p className="hint">{p.kind}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel clay-panel">
        <h2 className="panel-title">My timetable</h2>
        {slots.length === 0 ? (
          <p className="muted">No teaching slots yet — add your weekly timetable.</p>
        ) : (
          <ul>
            {slots
              .slice()
              .sort((a, b) => a.day - b.day || a.periodId.localeCompare(b.periodId))
              .map((s) => {
                const period = school.periods.find((p) => p.id === s.periodId);
                return (
                  <li key={s.id} className="upcoming-item">
                    <span className="time-pill">{DAY_NAMES[s.day - 1]}</span>
                    <div>
                      <strong>
                        {s.className}
                        {s.subject ? ` · ${s.subject}` : ""}
                      </strong>
                      <p className="hint">
                        {period?.name ?? s.periodId}
                        {s.room ? ` · ${s.room}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
      <AddDialog
        open={open}
        title="Add timetable slot"
        fields={[
          {
            name: "day",
            label: "Day",
            type: "select",
            options: DAY_NAMES.map((d, i) => ({
              value: String(i + 1),
              label: d,
            })),
          },
          {
            name: "periodId",
            label: "Period",
            type: "select",
            options: school.periods
              .filter((p) => p.kind === "lesson" || p.kind === "tutor")
              .map((p) => ({ value: p.id, label: `${p.name} (${p.start})` })),
          },
          { name: "className", label: "Class", required: true },
          { name: "subject", label: "Subject" },
          { name: "room", label: "Room" },
        ]}
        onClose={() => setOpen(false)}
        onSubmit={(v) =>
          addTimetableSlot({
            schoolId: school.id,
            day: Number(v.day || "1") as 1 | 2 | 3 | 4 | 5,
            periodId: v.periodId,
            className: v.className,
            subject: v.subject || undefined,
            room: v.room || undefined,
          })
        }
      />
    </div>
  );
}

export function SchoolLessonsPage() {
  const school = useSchool();
  const { data, addLesson } = useStore();
  const [open, setOpen] = useState(false);
  const lessons = data.lessons
    .filter((l) => l.schoolId === school.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow={school.shortName}
        title="Lesson plans"
        blurb="Daily / period lesson notes and objectives."
        actions={<AddButton label="Lesson" onClick={() => setOpen(true)} />}
      />
      <ListOrEmpty
        empty="No lesson plans yet."
        items={lessons.map((l) => (
          <li key={l.id} className="upcoming-item">
            <span className="time-pill">{formatShortDate(l.date)}</span>
            <div>
              <strong>{l.title}</strong>
              <p className="hint">
                {[l.className, l.objectives].filter(Boolean).join(" · ")}
              </p>
            </div>
          </li>
        ))}
      />
      <AddDialog
        open={open}
        title="Add lesson plan"
        fields={[
          { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
          { name: "title", label: "Title", required: true },
          { name: "className", label: "Class" },
          { name: "objectives", label: "Objectives", type: "textarea" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onClose={() => setOpen(false)}
        onSubmit={(v) =>
          addLesson({
            schoolId: school.id,
            date: v.date,
            title: v.title,
            className: v.className || undefined,
            objectives: v.objectives || undefined,
            notes: v.notes || undefined,
          })
        }
      />
    </div>
  );
}

export function SchoolRosterPage() {
  const school = useSchool();
  const { data, addStudent } = useStore();
  const [open, setOpen] = useState(false);
  const students = data.students
    .filter((s) => s.schoolId === school.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow={school.shortName}
        title="Class roster"
        blurb="Students, forms, and parent contact notes."
        actions={<AddButton label="Student" onClick={() => setOpen(true)} />}
      />
      <ListOrEmpty
        empty="No students yet."
        items={students.map((s) => (
          <li key={s.id} className="upcoming-item">
            <span className="time-pill">{s.yearGroup || "—"}</span>
            <div>
              <strong>{s.name}</strong>
              <p className="hint">
                {[s.form, s.parentContact, s.notes].filter(Boolean).join(" · ")}
              </p>
            </div>
          </li>
        ))}
      />
      <AddDialog
        open={open}
        title="Add student"
        fields={[
          { name: "name", label: "Name", required: true },
          { name: "yearGroup", label: "Year group", placeholder: "e.g. 8" },
          { name: "form", label: "Form" },
          { name: "parentContact", label: "Parent contact" },
          { name: "birthday", label: "Birthday (MM-DD)", placeholder: "03-14" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onClose={() => setOpen(false)}
        onSubmit={(v) =>
          addStudent({
            schoolId: school.id,
            name: v.name,
            yearGroup: v.yearGroup || undefined,
            form: v.form || undefined,
            parentContact: v.parentContact || undefined,
            birthday: v.birthday || undefined,
            notes: v.notes || undefined,
          })
        }
      />
    </div>
  );
}

export function SchoolAttendancePage() {
  const school = useSchool();
  const { data, upsertAttendance } = useStore();
  const students = data.students.filter((s) => s.schoolId === school.id);
  const [date, setDate] = useState(todayISO());
  const marks = useMemo(() => {
    const map = new Map<string, AttendanceMark>();
    for (const row of data.attendance) {
      if (row.schoolId === school.id && row.date === date) {
        map.set(row.studentId, row.mark);
      }
    }
    return map;
  }, [data.attendance, school.id, date]);

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow={school.shortName}
        title="Attendance"
        blurb="Mark present / absent / late for a day."
      />
      <label className="field" style={{ maxWidth: 220, marginBottom: "1rem" }}>
        <span>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      {students.length === 0 ? (
        <p className="muted">
          Add students on the{" "}
          <Link to={`/school/${school.id}/roster`}>roster</Link> first.
        </p>
      ) : (
        <ul className="panel clay-panel">
          {students.map((s) => (
            <li key={s.id} className="attendance-row">
              <strong>{s.name}</strong>
              <select
                value={marks.get(s.id) ?? ""}
                onChange={(e) => {
                  const mark = e.target.value as AttendanceMark;
                  if (!mark) return;
                  upsertAttendance({
                    schoolId: school.id,
                    studentId: s.id,
                    date,
                    mark,
                  });
                }}
              >
                <option value="">—</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="authorised">Authorised</option>
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SchoolGradesPage() {
  const school = useSchool();
  const { data, addGrade } = useStore();
  const [open, setOpen] = useState(false);
  const students = data.students.filter((s) => s.schoolId === school.id);
  const grades = data.grades
    .filter((g) => g.schoolId === school.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <SimpleAddList
      school={school}
      title="Grades & assessments"
      blurb="Scores and progress notes by student."
      empty="No grades logged."
      addLabel="Grade"
      open={open}
      setOpen={setOpen}
      items={grades.map((g) => {
        const student = students.find((s) => s.id === g.studentId);
        return (
          <li key={g.id} className="upcoming-item">
            <span className="time-pill">{formatShortDate(g.date)}</span>
            <div>
              <strong>
                {student?.name ?? "Student"} · {g.title}
              </strong>
              <p className="hint">
                {[g.score, g.notes].filter(Boolean).join(" · ")}
              </p>
            </div>
          </li>
        );
      })}
      fields={[
        {
          name: "studentId",
          label: "Student",
          type: "select",
          options: students.map((s) => ({ value: s.id, label: s.name })),
        },
        { name: "title", label: "Assessment", required: true },
        { name: "score", label: "Score / grade" },
        { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      onSubmit={(v) =>
        addGrade({
          schoolId: school.id,
          studentId: v.studentId,
          title: v.title,
          score: v.score || undefined,
          date: v.date,
          notes: v.notes || undefined,
        })
      }
    />
  );
}

export function SchoolBehaviourPage() {
  const school = useSchool();
  const { data, addBehaviour } = useStore();
  const [open, setOpen] = useState(false);
  const students = data.students.filter((s) => s.schoolId === school.id);
  const rows = data.behaviour
    .filter((b) => b.schoolId === school.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <SimpleAddList
      school={school}
      title="Behaviour log"
      blurb="Incidents, praise, and interventions."
      empty="No behaviour notes yet."
      addLabel="Entry"
      open={open}
      setOpen={setOpen}
      items={rows.map((b) => {
        const student = students.find((s) => s.id === b.studentId);
        return (
          <li key={b.id} className="upcoming-item">
            <span className="time-pill">{formatShortDate(b.date)}</span>
            <div>
              <strong>
                {b.title}
                {student ? ` · ${student.name}` : ""}
              </strong>
              <p className="hint">
                {[b.detail, b.intervention].filter(Boolean).join(" · ")}
              </p>
            </div>
          </li>
        );
      })}
      fields={[
        {
          name: "studentId",
          label: "Student (optional)",
          type: "select",
          options: [
            { value: "", label: "Whole class / none" },
            ...students.map((s) => ({ value: s.id, label: s.name })),
          ],
        },
        { name: "title", label: "Title", required: true },
        { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
        { name: "detail", label: "Detail", type: "textarea" },
        { name: "intervention", label: "Intervention", type: "textarea" },
      ]}
      onSubmit={(v) =>
        addBehaviour({
          schoolId: school.id,
          studentId: v.studentId || undefined,
          title: v.title,
          date: v.date,
          detail: v.detail || undefined,
          intervention: v.intervention || undefined,
        })
      }
    />
  );
}

export function SchoolHomeworkPage() {
  const school = useSchool();
  const { data, addHomework, toggleHomework } = useStore();
  const [open, setOpen] = useState(false);
  const rows = data.homework
    .filter((h) => h.schoolId === school.id)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow={school.shortName}
        title="Homework"
        blurb="Assignments, due dates, and completion."
        actions={<AddButton label="Homework" onClick={() => setOpen(true)} />}
      />
      {rows.length === 0 ? (
        <p className="muted">No homework logged.</p>
      ) : (
        <ul className="panel clay-panel">
          {rows.map((h) => (
            <li key={h.id} className="todo-row">
              <label>
                <input
                  type="checkbox"
                  checked={h.done}
                  onChange={() => toggleHomework(h.id)}
                />
                <span>
                  <strong>{h.title}</strong>
                  <span className="hint"> · due {formatShortDate(h.dueDate)}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <AddDialog
        open={open}
        title="Add homework"
        fields={[
          { name: "title", label: "Assignment", required: true },
          { name: "dueDate", label: "Due", type: "date", required: true, defaultValue: todayISO() },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onClose={() => setOpen(false)}
        onSubmit={(v) =>
          addHomework({
            schoolId: school.id,
            title: v.title,
            dueDate: v.dueDate,
            notes: v.notes || undefined,
          })
        }
      />
    </div>
  );
}

export function SchoolCommsPage() {
  const school = useSchool();
  const { data, addComms } = useStore();
  const [open, setOpen] = useState(false);
  const rows = data.comms
    .filter((c) => c.schoolId === school.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <SimpleAddList
      school={school}
      title="Parent communication"
      blurb="Log calls, emails, and meetings with families."
      empty="No communication logged."
      addLabel="Log"
      open={open}
      setOpen={setOpen}
      items={rows.map((c) => (
        <li key={c.id} className="upcoming-item">
          <span className="time-pill">{formatShortDate(c.date)}</span>
          <div>
            <strong>
              {c.contactName} · {c.method}
            </strong>
            <p className="hint">{c.summary}</p>
          </div>
        </li>
      ))}
      fields={[
        { name: "contactName", label: "Contact", required: true },
        { name: "method", label: "Method", defaultValue: "Phone" },
        { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
        { name: "summary", label: "Summary", type: "textarea", required: true },
      ]}
      onSubmit={(v) =>
        addComms({
          schoolId: school.id,
          contactName: v.contactName,
          method: v.method || "Phone",
          date: v.date,
          summary: v.summary,
        })
      }
    />
  );
}

export function SchoolContactsPage() {
  const school = useSchool();
  const { data, addContact } = useStore();
  const [open, setOpen] = useState(false);
  const rows = data.contacts
    .filter((c) => c.schoolId === school.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <SimpleAddList
      school={school}
      title="Contacts"
      blurb="Staff, parents, and key school numbers."
      empty="No contacts yet."
      addLabel="Contact"
      open={open}
      setOpen={setOpen}
      items={rows.map((c) => (
        <li key={c.id} className="upcoming-item">
          <span className="time-pill">{c.role}</span>
          <div>
            <strong>{c.name}</strong>
            <p className="hint">
              {[c.phone, c.email, c.notes].filter(Boolean).join(" · ")}
            </p>
          </div>
        </li>
      ))}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "role", label: "Role", required: true },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      onSubmit={(v) =>
        addContact({
          schoolId: school.id,
          name: v.name,
          role: v.role,
          phone: v.phone || undefined,
          email: v.email || undefined,
          notes: v.notes || undefined,
        })
      }
    />
  );
}

export function SchoolTodosPage() {
  const school = useSchool();
  const { data, addSchoolTodo, toggleSchoolTodo } = useStore();
  const [open, setOpen] = useState(false);
  const rows = data.schoolTodos.filter((t) => t.schoolId === school.id);

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow={school.shortName}
        title="School to-dos"
        blurb="Classroom and placement checklist for this school."
        actions={<AddButton label="To-do" onClick={() => setOpen(true)} />}
      />
      {rows.length === 0 ? (
        <p className="muted">Nothing on the list.</p>
      ) : (
        <ul className="panel clay-panel">
          {rows.map((t) => (
            <li key={t.id} className="todo-row">
              <label>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggleSchoolTodo(t.id)}
                />
                <span>
                  <strong>{t.label}</strong>
                  {t.dueDate ? (
                    <span className="hint"> · {formatShortDate(t.dueDate)}</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <AddDialog
        open={open}
        title="Add school to-do"
        fields={[
          { name: "label", label: "Task", required: true },
          { name: "dueDate", label: "Due", type: "date" },
        ]}
        onClose={() => setOpen(false)}
        onSubmit={(v) =>
          addSchoolTodo({
            schoolId: school.id,
            label: v.label,
            dueDate: v.dueDate || undefined,
          })
        }
      />
    </div>
  );
}

export function SchoolGoalsPage() {
  const school = useSchool();
  const { data, addGoal } = useStore();
  const [open, setOpen] = useState(false);
  const rows = data.goals.filter((g) => g.schoolId === school.id);

  return (
    <SimpleAddList
      school={school}
      title="Goals"
      blurb="Term / month goals for you and your classes."
      empty="No goals set."
      addLabel="Goal"
      open={open}
      setOpen={setOpen}
      items={rows.map((g) => (
        <li key={g.id} className="upcoming-item">
          <span className="time-pill">{g.period}</span>
          <div>
            <strong>{g.title}</strong>
            {g.notes ? <p className="hint">{g.notes}</p> : null}
          </div>
        </li>
      ))}
      fields={[
        { name: "title", label: "Goal", required: true },
        { name: "period", label: "Period", defaultValue: "Autumn Term 1" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      onSubmit={(v) =>
        addGoal({
          schoolId: school.id,
          title: v.title,
          period: v.period || "Term",
          notes: v.notes || undefined,
        })
      }
    />
  );
}

export function SchoolPdPage() {
  const school = useSchool();
  const { data, addPd } = useStore();
  const [open, setOpen] = useState(false);
  const rows = data.pd
    .filter((p) => p.schoolId === school.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <SimpleAddList
      school={school}
      title="Professional development"
      blurb="Workshops, training, and certifications."
      empty="No PD entries yet."
      addLabel="PD"
      open={open}
      setOpen={setOpen}
      items={rows.map((p) => (
        <li key={p.id} className="upcoming-item">
          <span className="time-pill">{formatShortDate(p.date)}</span>
          <div>
            <strong>{p.title}</strong>
            <p className="hint">
              {[p.provider, p.notes].filter(Boolean).join(" · ")}
            </p>
          </div>
        </li>
      ))}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "date", label: "Date", type: "date", required: true, defaultValue: todayISO() },
        { name: "provider", label: "Provider" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      onSubmit={(v) =>
        addPd({
          schoolId: school.id,
          title: v.title,
          date: v.date,
          provider: v.provider || undefined,
          notes: v.notes || undefined,
        })
      }
    />
  );
}

export function SchoolSuppliesPage() {
  const school = useSchool();
  const { data, addSupply } = useStore();
  const [open, setOpen] = useState(false);
  const rows = data.supplies.filter((s) => s.schoolId === school.id);

  return (
    <SimpleAddList
      school={school}
      title="Inventory & supplies"
      blurb="Classroom materials and resources."
      empty="No supplies listed."
      addLabel="Item"
      open={open}
      setOpen={setOpen}
      items={rows.map((s) => (
        <li key={s.id} className="upcoming-item">
          <span className="time-pill">{s.qty || "—"}</span>
          <div>
            <strong>{s.name}</strong>
            {s.notes ? <p className="hint">{s.notes}</p> : null}
          </div>
        </li>
      ))}
      fields={[
        { name: "name", label: "Item", required: true },
        { name: "qty", label: "Quantity" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      onSubmit={(v) =>
        addSupply({
          schoolId: school.id,
          name: v.name,
          qty: v.qty || undefined,
          notes: v.notes || undefined,
        })
      }
    />
  );
}

export function SchoolProjectsPage() {
  const school = useSchool();
  const { data, addProject } = useStore();
  const [open, setOpen] = useState(false);
  const rows = data.projects.filter((p) => p.schoolId === school.id);

  return (
    <SimpleAddList
      school={school}
      title="Projects"
      blurb="Longer projects and special events."
      empty="No projects yet."
      addLabel="Project"
      open={open}
      setOpen={setOpen}
      items={rows.map((p) => (
        <li key={p.id} className="upcoming-item">
          <span className="time-pill">{p.status}</span>
          <div>
            <strong>{p.title}</strong>
            <p className="hint">{p.notes}</p>
          </div>
        </li>
      ))}
      fields={[
        { name: "title", label: "Title", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "planned", label: "Planned" },
            { value: "active", label: "Active" },
            { value: "done", label: "Done" },
          ],
        },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
      onSubmit={(v) =>
        addProject({
          schoolId: school.id,
          title: v.title,
          status: (v.status as "planned" | "active" | "done") || "planned",
          notes: v.notes || undefined,
        })
      }
    />
  );
}

export function SchoolBirthdaysPage() {
  const school = useSchool();
  const { data } = useStore();
  const students = data.students
    .filter((s) => s.schoolId === school.id && s.birthday)
    .sort((a, b) => (a.birthday ?? "").localeCompare(b.birthday ?? ""));

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow={school.shortName}
        title="Birthdays & special dates"
        blurb="From roster birthday fields — add them on the roster page."
      />
      {students.length === 0 ? (
        <p className="muted">
          No birthdays saved. Add MM-DD on{" "}
          <Link to={`/school/${school.id}/roster`}>roster</Link>.
        </p>
      ) : (
        <ul className="panel clay-panel">
          {students.map((s) => (
            <li key={s.id} className="upcoming-item">
              <span className="time-pill">{s.birthday}</span>
              <div>
                <strong>{s.name}</strong>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListOrEmpty({
  empty,
  items,
}: {
  empty: string;
  items: ReactNode[];
}) {
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return <ul className="panel clay-panel">{items}</ul>;
}

function SimpleAddList({
  school,
  title,
  blurb,
  empty,
  addLabel,
  open,
  setOpen,
  items,
  fields,
  onSubmit,
}: {
  school: School;
  title: string;
  blurb: string;
  empty: string;
  addLabel: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  items: ReactNode[];
  fields: Parameters<typeof AddDialog>[0]["fields"];
  onSubmit: (v: Record<string, string>) => void;
}) {
  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow={school.shortName}
        title={title}
        blurb={blurb}
        actions={<AddButton label={addLabel} onClick={() => setOpen(true)} />}
      />
      <ListOrEmpty empty={empty} items={items} />
      <AddDialog
        open={open}
        title={`Add ${addLabel.toLowerCase()}`}
        fields={fields}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
      />
    </div>
  );
}
