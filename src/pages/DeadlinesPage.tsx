import { useMemo, useState } from "react";
import { AddButton, AddDialog, PageHeader } from "../components/AddDialog";
import { todayISO } from "../data/dates";
import { buildIcs, downloadIcs } from "../data/ical";
import { formatShortDate, useStore } from "../data/store";
import type {
  AssessmentItem,
  AssessmentPriority,
  EventTrack,
} from "../data/types";

function daysUntil(iso: string, today: string) {
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = iso.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

function countdownLabel(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  if (days < 7) return `${days} days left`;
  if (days < 30) return `${Math.ceil(days / 7)} wk left`;
  return `${Math.ceil(days / 30)} mo left`;
}

type Filter = "upcoming" | "critical" | "done" | "all";

function addDaysSafe(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function DeadlinesPage() {
  const {
    data,
    toggleAssessment,
    addAssessment,
    updateAssessment,
    deleteAssessment,
  } = useStore();
  const today = todayISO();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<AssessmentItem | null>(null);

  const items = useMemo(() => {
    let list = [...data.assessments];
    if (filter === "upcoming") {
      list = list.filter((a) => !a.done && a.date >= addDaysSafe(today, -1));
    } else if (filter === "critical") {
      list = list.filter((a) => !a.done && a.priority === "critical");
    } else if (filter === "done") {
      list = list.filter((a) => a.done);
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [data.assessments, filter, today]);

  const nextCritical = useMemo(() => {
    return data.assessments
      .filter((a) => !a.done && a.priority === "critical" && a.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [data.assessments, today]);

  const openCount = data.assessments.filter((a) => !a.done).length;

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow="Key Assessment Dates"
        title="Deadlines"
        blurb="Click any assessment to edit notes, dates, priority, or delete."
        actions={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const ics = buildIcs({
                  events: data.events.filter(
                    (e) => e.kind === "deadline" || e.isAssessment,
                  ),
                  assessments: data.assessments,
                  calendarName: "QTS Deadlines",
                });
                downloadIcs("qts-deadlines.ics", ics);
              }}
            >
              Export .ics
            </button>
            <AddButton label="Deadline" onClick={() => setAddOpen(true)} />
          </>
        }
      />

      {nextCritical ? (
        <section className="clay-panel deadline-hero">
          <p className="section-label">Next critical</p>
          <h2>{nextCritical.title}</h2>
          <p className="deadline-count">
            {countdownLabel(daysUntil(nextCritical.date, today))}
          </p>
          <p className="muted">
            {formatShortDate(nextCritical.date)}
            {nextCritical.endDate
              ? ` – ${formatShortDate(nextCritical.endDate)}`
              : ""}
            {" · "}
            {nextCritical.type}
          </p>
        </section>
      ) : null}

      <div className="dash-grid" style={{ margin: "1.25rem 0" }}>
        <section className="clay-panel span-4">
          <div className="learn-badge" style={{ background: "var(--peach)" }}>
            {openCount}
          </div>
          <p className="muted">open assessments</p>
        </section>
        <section className="clay-panel span-4">
          <div className="learn-badge">
            {
              data.assessments.filter(
                (a) =>
                  !a.done &&
                  daysUntil(a.date, today) >= 0 &&
                  daysUntil(a.date, today) <= 14,
              ).length
            }
          </div>
          <p className="muted">due within 2 weeks</p>
        </section>
        <section className="clay-panel span-4">
          <div className="learn-badge" style={{ background: "var(--mint)" }}>
            {data.assessments.filter((a) => a.done).length}
          </div>
          <p className="muted">ticked off</p>
        </section>
      </div>

      <div className="tab-row" style={{ marginBottom: "1rem" }}>
        {(
          [
            ["upcoming", "Upcoming"],
            ["critical", "Critical"],
            ["done", "Done"],
            ["all", "All"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn${filter === id ? " btn-primary btn-clay" : ""}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="deadline-list">
        {items.map((item) => {
          const days = daysUntil(item.date, today);
          const urgent = !item.done && days <= 14;
          const overdue = !item.done && days < 0;
          return (
            <article
              key={item.id}
              className={`clay-panel assessment-card clickable${
                item.done ? " done" : ""
              }${overdue ? " overdue" : urgent ? " urgent" : ""}`}
              onClick={() => setEditing(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setEditing(item);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="assessment-top">
                <button
                  type="button"
                  className={`todo-check${item.done ? " done" : ""}`}
                  aria-label={item.done ? "Mark not done" : "Mark done"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAssessment(item.id);
                  }}
                />
                <div className="assessment-main">
                  <div className="assessment-meta">
                    <span className={`priority-pill ${item.priority}`}>
                      {item.priority}
                    </span>
                    <span className="clay-chip">{item.type}</span>
                    <span className="hint">
                      {formatShortDate(item.date)}
                      {item.endDate
                        ? ` – ${formatShortDate(item.endDate)}`
                        : ""}
                    </span>
                  </div>
                  <h2>{item.title}</h2>
                  <p className="muted">{item.description}</p>
                  {item.notes ? (
                    <p className="hint notes-preview">{item.notes}</p>
                  ) : (
                    <p className="hint">Tap to add notes…</p>
                  )}
                </div>
                <div
                  className={`countdown-badge${
                    overdue ? " overdue" : urgent ? " urgent" : ""
                  }`}
                >
                  {item.done ? "Done" : countdownLabel(days)}
                </div>
              </div>
            </article>
          );
        })}
        {items.length === 0 ? (
          <p className="muted">Nothing in this filter.</p>
        ) : null}
      </div>

      <AddDialog
        open={addOpen}
        title="Add assessment / deadline"
        fields={[
          { name: "title", label: "Title", required: true },
          {
            name: "date",
            label: "Date",
            type: "date",
            required: true,
            defaultValue: today,
          },
          { name: "endDate", label: "End date (optional)", type: "date" },
          { name: "type", label: "Type", required: true },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            options: [
              { value: "critical", label: "Critical" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
            ],
          },
          { name: "description", label: "Description", type: "textarea" },
          { name: "who", label: "Who" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onClose={() => setAddOpen(false)}
        onSubmit={(v) =>
          addAssessment({
            title: v.title,
            date: v.date,
            endDate: v.endDate || undefined,
            type: v.type || "Custom",
            description: v.description || "",
            who: v.who || "You",
            priority: (v.priority || "high") as AssessmentPriority,
            track: "all" as EventTrack,
            notes: v.notes || "",
          })
        }
      />

      <AddDialog
        open={!!editing}
        formKey={editing?.id}
        title="Edit assessment"
        submitLabel="Save"
        fields={[
          {
            name: "title",
            label: "Title",
            required: true,
            defaultValue: editing?.title,
          },
          {
            name: "date",
            label: "Date",
            type: "date",
            required: true,
            defaultValue: editing?.date,
          },
          {
            name: "endDate",
            label: "End date",
            type: "date",
            defaultValue: editing?.endDate ?? "",
          },
          {
            name: "type",
            label: "Type",
            required: true,
            defaultValue: editing?.type,
          },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            defaultValue: editing?.priority,
            options: [
              { value: "critical", label: "Critical" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
            ],
          },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            defaultValue: editing?.description,
          },
          {
            name: "who",
            label: "Who",
            defaultValue: editing?.who,
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            defaultValue: editing?.notes ?? "",
          },
        ]}
        onClose={() => setEditing(null)}
        onDelete={editing ? () => deleteAssessment(editing.id) : undefined}
        onSubmit={(v) => {
          if (!editing) return;
          updateAssessment(editing.id, {
            title: v.title,
            date: v.date,
            endDate: v.endDate || undefined,
            type: v.type,
            priority: v.priority as AssessmentPriority,
            description: v.description || "",
            who: v.who || "",
            notes: v.notes || "",
          });
        }}
      />
    </div>
  );
}
