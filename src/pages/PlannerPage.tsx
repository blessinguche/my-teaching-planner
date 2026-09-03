import { useMemo, useState } from "react";
import { AddButton, AddDialog, PageHeader } from "../components/AddDialog";
import {
  CalendarBoard,
  cursorLabel,
  eventsForDate,
  shiftCursor,
} from "../components/CalendarBoard";
import { addDays, todayISO } from "../data/dates";
import { buildIcs, downloadIcs } from "../data/ical";
import { formatDayHeading, formatShortDate, useStore } from "../data/store";
import type { EventKind, PlannerEvent } from "../data/types";

type ViewMode = "month" | "week" | "day" | "agenda" | "deadlines";
type KindFilter = "all" | "training" | "deadline" | "meeting" | "break";

function daysUntil(iso: string, today: string) {
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = iso.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

function matchesKind(ev: PlannerEvent, filter: KindFilter) {
  if (filter === "all") return true;
  if (filter === "deadline") return ev.kind === "deadline" || !!ev.isAssessment;
  if (filter === "meeting") return ev.kind === "meeting";
  if (filter === "break") {
    return (
      ev.module === "Break" ||
      /half term|break|holiday|easter|christmas/i.test(ev.title)
    );
  }
  return ev.kind === "itap" || (ev.kind === "personal" && ev.module !== "Break");
}

export function PlannerPage() {
  const { data, addEvent } = useStore();
  const today = todayISO();
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(today);
  const [kind, setKind] = useState<KindFilter>("all");
  const [track, setTrack] = useState<"ft" | "all">("ft");
  const [addOpen, setAddOpen] = useState(false);

  const allEvents = useMemo(() => {
    const schoolClosures = data.schools.flatMap((school) =>
      school.closures.map(
        (c): PlannerEvent => ({
          id: `closure-${school.id}-${c.id}`,
          date: c.start,
          endDate: c.end,
          start: "00:00",
          end: "23:59",
          title: `${school.shortName}: ${c.label}`,
          detail: c.kind === "inset" ? "School closed to students" : undefined,
          kind: "personal",
          module: "Break",
          track: "all",
          schoolId: school.id,
          source: "school",
        }),
      ),
    );
    const homework = data.homework.map(
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
    return [...data.events, ...schoolClosures, ...homework];
  }, [data.events, data.schools, data.homework]);

  const meetingOptions = useMemo(
    () =>
      allEvents
        .filter((e) => e.kind === "meeting")
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 40),
    [allEvents],
  );

  const filtered = useMemo(() => {
    return allEvents.filter((ev) => {
      if (!matchesKind(ev, kind)) return false;
      const t = ev.track ?? "all";
      if (track === "ft" && (t === "pt" || t === "extension")) return false;
      return true;
    });
  }, [allEvents, kind, track]);

  const agenda = useMemo(() => {
    const horizon = view === "agenda" ? addDays(today, 60) : addDays(today, 120);
    const map = new Map<string, PlannerEvent[]>();
    for (const event of [...filtered].sort(
      (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
    )) {
      if (view === "deadlines") {
        if (!(event.kind === "deadline" || event.isAssessment)) continue;
        if (event.date < today) continue;
      } else {
        if (event.date < addDays(today, -2) || event.date > horizon) continue;
      }
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return [...map.entries()];
  }, [filtered, today, view]);

  const selectedDay = eventsForDate(filtered, cursor);

  function exportIcs() {
    const ics = buildIcs({
      events: filtered,
      assessments: data.assessments,
      calendarName: "Teaching Planner",
    });
    downloadIcs("teaching-planner.ics", ics);
  }

  const showCalendar = view === "month" || view === "week" || view === "day";

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow="Central calendar"
        title="Calendar"
        blurb="QTS, school terms, deadlines and meetings in one place. Click a day to preview · double-click for day view."
        actions={
          <>
            <button type="button" className="btn" onClick={exportIcs}>
              Export .ics
            </button>
            <AddButton label="Event" onClick={() => setAddOpen(true)} />
          </>
        }
      />

      <div className="toolbar-row">
        <div className="tab-row" role="tablist">
          {(
            [
              ["month", "Month"],
              ["week", "Week"],
              ["day", "Day"],
              ["agenda", "Agenda"],
              ["deadlines", "Deadlines"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`btn${view === id ? " btn-primary btn-clay" : ""}`}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="tab-row">
          <button
            type="button"
            className={`btn${track === "ft" ? " btn-primary btn-clay" : ""}`}
            onClick={() => setTrack("ft")}
          >
            Full-time
          </button>
          <button
            type="button"
            className={`btn${track === "all" ? " btn-primary btn-clay" : ""}`}
            onClick={() => setTrack("all")}
          >
            All tracks
          </button>
        </div>
      </div>

      <div className="tab-row" style={{ marginBottom: "1rem" }}>
        {(
          [
            ["all", "All"],
            ["training", "Training"],
            ["deadline", "Assessments"],
            ["break", "Breaks"],
            ["meeting", "Meetings"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn${kind === id ? " btn-peach btn-clay" : ""}`}
            onClick={() => setKind(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {showCalendar ? (
        <>
          <div className="cal-nav">
            <button
              type="button"
              className="btn"
              aria-label="Previous"
              onClick={() =>
                setCursor(shiftCursor(cursor, view as "month" | "week" | "day", -1))
              }
            >
              ‹
            </button>
            <h2>{cursorLabel(cursor, view as "month" | "week" | "day")}</h2>
            <button
              type="button"
              className="btn"
              aria-label="Next"
              onClick={() =>
                setCursor(shiftCursor(cursor, view as "month" | "week" | "day", 1))
              }
            >
              ›
            </button>
            <button type="button" className="btn" onClick={() => setCursor(today)}>
              Today
            </button>
          </div>

          <CalendarBoard
            mode={view as "month" | "week" | "day"}
            cursor={cursor}
            events={filtered}
            onSelectDate={(iso) => setCursor(iso)}
            onOpenDay={(iso) => {
              setCursor(iso);
              setView("day");
            }}
          />

          {view !== "day" ? (
            <section className="panel clay-panel" style={{ marginTop: "0.9rem" }}>
              <h3 className="panel-title">{formatDayHeading(cursor)}</h3>
              {selectedDay.length === 0 ? (
                <p className="muted">Nothing on this day.</p>
              ) : (
                <ul>
                  {selectedDay.map((ev) => (
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
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </>
      ) : (
        <div className="planner-stack">
          {agenda.length === 0 ? (
            <p className="muted">Nothing in this view/filter.</p>
          ) : null}
          {agenda.map(([date, events]) => {
            const isToday = date === today;
            const dueIn = daysUntil(date, today);
            return (
              <section
                key={date}
                className={`panel day-sheet${isToday ? " is-today" : ""}`}
              >
                <div className="day-sheet-head">
                  <div>
                    <h2>{formatDayHeading(date)}</h2>
                    <p className="hint">
                      {events[0]?.module ?? "Programme"}
                      {dueIn > 0 ? ` · in ${dueIn}d` : ""}
                      {dueIn === 0 ? " · today" : ""}
                    </p>
                  </div>
                  <span className="clay-chip">
                    {isToday ? "Today" : formatShortDate(date)}
                  </span>
                </div>
                <ul>
                  {events.map((ev) => {
                    const isDeadline =
                      ev.kind === "deadline" || !!ev.isAssessment;
                    const isBreak = ev.module === "Break";
                    return (
                      <li
                        key={ev.id}
                        className={`timeline-item${
                          isDeadline ? " is-deadline" : isBreak ? " is-break" : ""
                        }`}
                      >
                        <span
                          className={`time-pill${
                            isDeadline ? " deadline" : isBreak ? " break" : ""
                          }`}
                        >
                          {isBreak ? "OFF" : isDeadline ? "DUE" : ev.start}
                        </span>
                        <div>
                          <strong>{ev.title}</strong>
                          {ev.detail ? <p className="hint">{ev.detail}</p> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <AddDialog
        open={addOpen}
        title="Add calendar item"
        description="Deadline, meeting, training day, or break. Deadlines can link to a meeting."
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "date", label: "Date", type: "date", required: true, defaultValue: cursor },
          { name: "endDate", label: "End date (for breaks)", type: "date" },
          { name: "start", label: "Start", type: "time", defaultValue: "09:15" },
          { name: "end", label: "End", type: "time", defaultValue: "16:30" },
          {
            name: "kind",
            label: "Type",
            type: "select",
            options: [
              { value: "deadline", label: "Deadline" },
              { value: "meeting", label: "Meeting" },
              { value: "itap", label: "Training / ITAP" },
              { value: "personal", label: "Break / personal" },
            ],
          },
          {
            name: "link",
            label: "Link (Meet / Teams / docs)",
            placeholder: "https://…",
          },
          {
            name: "linkedMeetingId",
            label: "Link to meeting (optional)",
            type: "select",
            options: [
              { value: "", label: "None" },
              ...meetingOptions.map((m) => ({
                value: m.id,
                label: `${m.date} · ${m.title.slice(0, 48)}`,
              })),
            ],
          },
          { name: "detail", label: "Notes", type: "textarea" },
        ]}
        onClose={() => setAddOpen(false)}
        onSubmit={(v) => {
          const kindVal = (v.kind || "deadline") as EventKind;
          const isBreak = kindVal === "personal";
          addEvent({
            date: v.date,
            endDate: v.endDate || undefined,
            start: isBreak ? "00:00" : v.start || "09:15",
            end: isBreak ? "23:59" : v.end || "16:30",
            title: v.title,
            detail: v.detail || undefined,
            kind: kindVal,
            track: "all",
            isAssessment: kindVal === "deadline",
            module: isBreak ? "Break" : "Added by you",
            link: v.link || undefined,
            linkedMeetingId: v.linkedMeetingId || undefined,
            source: "personal",
          });
        }}
      />
    </div>
  );
}
