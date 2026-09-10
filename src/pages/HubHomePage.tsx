import { useMemo, useState } from "react";
import { AddDialog } from "../components/AddDialog";
import {
  CalendarBoard,
  cursorLabel,
  eventsForDate,
  shiftCursor,
} from "../components/CalendarBoard";
import { JumpTiles, PaperPage, Sheet } from "../components/PlannerUI";
import { SOURCE_COLORS, schoolSwatch } from "../data/calendarSources";
import { addDays, todayISO } from "../data/dates";
import { formatDayHeading, formatShortDate, useStore } from "../data/store";
import { timetableEventsForRange } from "../data/timetableEvents";
import type { PlannerEvent } from "../data/types";

function formatToday() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function eventTimeLabel(ev: PlannerEvent) {
  if (ev.module === "Break") return "OFF";
  if (ev.kind === "deadline" || ev.isAssessment) return "DUE";
  return ev.start;
}

export function HubHomePage() {
  const { data, addEvent } = useStore();
  const today = todayISO();
  const [cursor, setCursor] = useState(today);
  const [addOpen, setAddOpen] = useState(false);

  const schoolIndex = useMemo(() => {
    const map = new Map<string, number>();
    data.schools.forEach((s, i) => map.set(s.id, i));
    return map;
  }, [data.schools]);

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
    const lessons = timetableEventsForRange(
      data.schools,
      data.timetable,
      addDays(today, -14),
      addDays(today, 120),
    );
    return [...data.events, ...closures, ...homework, ...lessons];
  }, [data.events, data.schools, data.homework, data.timetable, today]);

  const selected = eventsForDate(hubEvents, cursor);
  const primarySchool = data.schools[0];

  return (
    <PaperPage
      title={formatToday()}
      caption="Teaching Planner · schools, QTS, deadlines"
      actions={
        <button type="button" className="btn" onClick={() => setAddOpen(true)}>
          + Deadline / meeting
        </button>
      }
    >
      <JumpTiles
        items={[
          ...data.schools.map((school) => ({
            id: school.id,
            label: school.shortName,
            blurb: school.academicYear,
            href: `/school/${school.id}`,
          })),
          { id: "schools", label: "Schools", blurb: "Manage", href: "/schools" },
          { id: "cal", label: "Cal", blurb: "Full calendar", href: "/cal" },
          { id: "qts", label: "QTS", blurb: "Standards", href: "/qts" },
          {
            id: "add-deadline",
            label: "+ Deadline",
            blurb: "Or meeting",
            onClick: () => setAddOpen(true),
          },
        ]}
      />

      <div className="hub-cal-legend" aria-label="Calendar colours">
        <span className="hub-cal-legend-item">
          <i className="gcal-swatch" style={{ background: SOURCE_COLORS.qts }} />
          QTS / NIoT
        </span>
        <span className="hub-cal-legend-item">
          <i className="gcal-swatch" style={{ background: SOURCE_COLORS.deadlines }} />
          Deadlines
        </span>
        {data.schools.map((s, i) => (
          <span key={s.id} className="hub-cal-legend-item">
            <i className="gcal-swatch" style={{ background: schoolSwatch(i) }} />
            {s.shortName}
          </span>
        ))}
      </div>

      <div className="cal-nav">
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
        schoolColorIndex={schoolIndex}
        onSelectDate={setCursor}
        onOpenDay={(iso) => setCursor(iso)}
      />

      <Sheet className="hub-day-sheet">
        <div className="planner-bar soft" style={{ display: "block" }}>
          <span>{formatDayHeading(cursor)}</span>
        </div>
        <div className="planner-grid joined">
          {selected.length === 0 ? (
            <div className="planner-row" style={{ gridTemplateColumns: "1fr" }}>
              <div className="planner-cell" style={{ padding: "0.55rem 0.65rem" }}>
                <span className="muted">
                  Nothing on this day. Open Cal for the full week calendar.
                </span>
              </div>
            </div>
          ) : (
            selected.map((ev) => {
              const meeting = ev.linkedMeetingId
                ? hubEvents.find((m) => m.id === ev.linkedMeetingId)
                : undefined;
              return (
                <div
                  key={ev.id}
                  className="planner-row"
                  style={{ gridTemplateColumns: "18% 1fr" }}
                >
                  <div className="planner-label-cell">{eventTimeLabel(ev)}</div>
                  <div className="planner-cell" style={{ padding: "0.4rem 0.55rem" }}>
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
                </div>
              );
            })
          )}
        </div>
      </Sheet>

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
    </PaperPage>
  );
}
