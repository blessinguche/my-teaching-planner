import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AddDialog } from "../components/AddDialog";
import {
  CalendarBoard,
  cursorLabel,
  eventsForDate,
  shiftCursor,
} from "../components/CalendarBoard";
import { todayISO } from "../data/dates";
import { formatDayHeading, formatShortDate, useStore } from "../data/store";
import type { PlannerEvent } from "../data/types";

function formatToday() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

export function HubHomePage() {
  const { data, addEvent } = useStore();
  const today = todayISO();
  const [cursor, setCursor] = useState(today);
  const [addOpen, setAddOpen] = useState(false);

  const hubEvents = useMemo(() => {
    const closures = data.schools.flatMap((school) =>
      school.closures.map(
        (c): PlannerEvent => ({
          id: `closure-${school.id}-${c.id}`,
          date: c.start,
          endDate: c.end,
          start: "00:00",
          end: "23:59",
          title: `${school.shortName}: ${c.label}`,
          kind: "personal",
          module: "Break",
          schoolId: school.id,
          source: "school",
        }),
      ),
    );
    const homework = data.homework
      .filter((h) => !h.done)
      .map(
        (h): PlannerEvent => ({
          id: `hw-${h.id}`,
          date: h.dueDate,
          start: "09:00",
          end: "09:00",
          title: `HW: ${h.title}`,
          kind: "deadline",
          isAssessment: true,
          schoolId: h.schoolId,
          source: "school",
        }),
      );
    return [...data.events, ...closures, ...homework];
  }, [data.events, data.schools, data.homework]);

  const selected = eventsForDate(hubEvents, cursor);
  const primarySchool = data.schools[0];

  return (
    <div className="page-enter">
      <header className="dash-header">
        <div>
          <p className="eyebrow">Teaching Planner</p>
          <h1>{formatToday()}</h1>
          <p className="subtitle">
            One calendar for schools, QTS, deadlines and meetings.
          </p>
        </div>
        <div className="page-actions">
          <Link to="/cal" className="btn btn-primary btn-clay">
            Open calendar
          </Link>
          <Link to="/qts" className="btn btn-peach btn-clay">
            QTS area
          </Link>
        </div>
      </header>

      <div className="hub-jump-row">
        {data.schools.map((school) => (
          <Link
            key={school.id}
            className="btn btn-clay"
            to={`/school/${school.id}`}
          >
            {school.shortName}
          </Link>
        ))}
        <Link className="btn" to="/schools">
          Manage schools
        </Link>
        <button type="button" className="btn" onClick={() => setAddOpen(true)}>
          + Deadline / meeting
        </button>
      </div>

      <div className="cal-nav" style={{ marginTop: "1rem" }}>
        <button
          type="button"
          className="btn"
          aria-label="Previous month"
          onClick={() => setCursor(shiftCursor(cursor, "month", -1))}
        >
          ‹
        </button>
        <h2>{cursorLabel(cursor, "month")}</h2>
        <button
          type="button"
          className="btn"
          aria-label="Next month"
          onClick={() => setCursor(shiftCursor(cursor, "month", 1))}
        >
          ›
        </button>
        <button type="button" className="btn" onClick={() => setCursor(today)}>
          Today
        </button>
      </div>

      <CalendarBoard
        mode="month"
        cursor={cursor}
        events={hubEvents}
        onSelectDate={setCursor}
        onOpenDay={(iso) => {
          setCursor(iso);
        }}
      />

      <section className="panel clay-panel" style={{ marginTop: "0.9rem" }}>
        <h3 className="panel-title">{formatDayHeading(cursor)}</h3>
        {selected.length === 0 ? (
          <p className="muted">Nothing on this day. Double-click a day on Cal for the full day view.</p>
        ) : (
          <ul>
            {selected.map((ev) => {
              const meeting = ev.linkedMeetingId
                ? hubEvents.find((m) => m.id === ev.linkedMeetingId)
                : undefined;
              return (
                <li
                  key={ev.id}
                  className={`timeline-item${
                    ev.kind === "deadline" || ev.isAssessment
                      ? " is-deadline"
                      : ev.module === "Break"
                        ? " is-break"
                        : ""
                  }`}
                >
                  <span
                    className={`time-pill${
                      ev.kind === "deadline" || ev.isAssessment
                        ? " deadline"
                        : ev.module === "Break"
                          ? " break"
                          : ""
                    }`}
                  >
                    {ev.module === "Break"
                      ? "OFF"
                      : ev.kind === "deadline" || ev.isAssessment
                        ? "DUE"
                        : ev.start}
                  </span>
                  <div>
                    <strong>{ev.title}</strong>
                    {ev.detail ? <p className="hint">{ev.detail}</p> : null}
                    {meeting ? (
                      <p className="hint">
                        Linked meeting: {meeting.title} ({formatShortDate(meeting.date)})
                      </p>
                    ) : null}
                    {ev.link ? (
                      <p className="hint">
                        <a href={ev.link} target="_blank" rel="noreferrer">
                          Open link
                        </a>
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {primarySchool ? (
        <p className="hint" style={{ marginTop: "1rem" }}>
          Primary placement: {primarySchool.name} · {primarySchool.academicYear}
        </p>
      ) : null}

      <AddDialog
        open={addOpen}
        title="Add deadline or meeting"
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "date", label: "Date", type: "date", required: true, defaultValue: cursor },
          { name: "start", label: "Start", type: "time", defaultValue: "09:00" },
          { name: "end", label: "End", type: "time", defaultValue: "10:00" },
          {
            name: "kind",
            label: "Type",
            type: "select",
            options: [
              { value: "deadline", label: "Deadline" },
              { value: "meeting", label: "Meeting" },
            ],
          },
          { name: "link", label: "Link (optional)", placeholder: "https://…" },
          { name: "detail", label: "Notes", type: "textarea" },
        ]}
        onClose={() => setAddOpen(false)}
        onSubmit={(v) => {
          const kind = v.kind === "meeting" ? "meeting" : "deadline";
          addEvent({
            date: v.date,
            start: v.start || "09:00",
            end: v.end || "10:00",
            title: v.title,
            detail: v.detail || undefined,
            kind,
            isAssessment: kind === "deadline",
            track: "all",
            module: "Added by you",
            link: v.link || undefined,
            source: "personal",
          });
        }}
      />
    </div>
  );
}
