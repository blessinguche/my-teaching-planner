import { useEffect, useMemo, useState } from "react";
import { AddDialog } from "../components/AddDialog";
import {
  CalendarBoard,
  cursorLabel,
  eventsForDate,
  MiniMonth,
  shiftCursor,
} from "../components/CalendarBoard";
import { PaperPage, Sheet } from "../components/PlannerUI";
import {
  eventMatchesSources,
  schoolSwatch,
  SOURCE_COLORS,
  type CalendarSourceId,
  type CalendarToggle,
} from "../data/calendarSources";
import { addDays, todayISO } from "../data/dates";
import { buildIcs, downloadIcs } from "../data/ical";
import { formatDayHeading, formatShortDate, useStore } from "../data/store";
import { timetableEventsForRange } from "../data/timetableEvents";
import type { EventKind, PlannerEvent } from "../data/types";

type ViewMode = "month" | "week" | "day" | "agenda" | "deadlines";

function daysUntil(iso: string, today: string) {
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = iso.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

function eventTimeLabel(ev: PlannerEvent) {
  if (ev.module === "Break") return "OFF";
  if (ev.kind === "deadline" || ev.isAssessment) return "DUE";
  return ev.start;
}

function softActive(active: boolean) {
  return active
    ? {
        background: "var(--planner-teal-soft)",
        borderColor: "var(--planner-line)",
        color: "var(--planner-teal-deep)",
        fontWeight: 800,
      }
    : undefined;
}

export function PlannerPage() {
  const { data, addEvent } = useStore();
  const today = todayISO();
  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState(today);
  const [track, setTrack] = useState<"ft" | "all">("ft");
  const [addOpen, setAddOpen] = useState(false);

  const schoolIndex = useMemo(() => {
    const map = new Map<string, number>();
    data.schools.forEach((s, i) => map.set(s.id, i));
    return map;
  }, [data.schools]);

  const calendarToggles = useMemo((): CalendarToggle[] => {
    return [
      { id: "qts", label: "QTS (NIoT days / events)", color: SOURCE_COLORS.qts },
      { id: "deadlines", label: "Deadlines", color: SOURCE_COLORS.deadlines },
      ...data.schools.map((s, i) => ({
        id: `school:${s.id}` as CalendarSourceId,
        label: s.shortName || s.name,
        color: schoolSwatch(i),
      })),
    ];
  }, [data.schools]);

  const [enabledSources, setEnabledSources] = useState<Set<CalendarSourceId>>(
    () => new Set(["qts", "deadlines"]),
  );

  useEffect(() => {
    setEnabledSources((prev) => {
      const next = new Set(prev);
      next.add("qts");
      next.add("deadlines");
      for (const s of data.schools) {
        next.add(`school:${s.id}`);
      }
      return next;
    });
  }, [data.schools]);

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
    const lessons = timetableEventsForRange(
      data.schools,
      data.timetable,
      addDays(today, -30),
      addDays(today, 180),
    );
    return [...data.events, ...schoolClosures, ...homework, ...lessons];
  }, [data.events, data.schools, data.homework, data.timetable, today]);

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
      if (!eventMatchesSources(ev, enabledSources)) return false;
      const t = ev.track ?? "all";
      if (track === "ft" && (t === "pt" || t === "extension")) return false;
      return true;
    });
  }, [allEvents, enabledSources, track]);

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
  const showCalendar = view === "month" || view === "week" || view === "day";
  const calMode = view === "month" || view === "week" || view === "day" ? view : "week";

  function exportIcs() {
    const ics = buildIcs({
      events: filtered,
      assessments: data.assessments,
      calendarName: "Teaching Planner",
    });
    downloadIcs("teaching-planner.ics", ics);
  }

  function toggleSource(id: CalendarSourceId) {
    setEnabledSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <PaperPage
      title="Calendar"
      caption="QTS, school terms, deadlines and meetings · week view by default"
      actions={
        <>
          <button type="button" className="btn" onClick={exportIcs}>
            Export .ics
          </button>
          <button type="button" className="btn" onClick={() => setAddOpen(true)}>
            + Event
          </button>
        </>
      }
    >
      <div className="gcal-shell">
        <aside className="gcal-sidebar">
          <button
            type="button"
            className="btn gcal-create"
            onClick={() => setAddOpen(true)}
          >
            + Create
          </button>

          <MiniMonth
            cursor={cursor}
            onSelectDate={setCursor}
            onShiftMonth={(dir) => setCursor(shiftCursor(cursor, "month", dir))}
          />

          <div className="gcal-cal-list">
            <p className="gcal-cal-list-title">Calendars</p>
            {calendarToggles.map((t) => {
              const on = enabledSources.has(t.id);
              return (
                <label key={t.id} className={`gcal-cal-item${on ? " is-on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleSource(t.id)}
                  />
                  <span
                    className="gcal-swatch"
                    style={{ background: t.color }}
                    aria-hidden
                  />
                  <span>{t.label}</span>
                </label>
              );
            })}
          </div>

          <div className="gcal-sidebar-meta">
            <button
              type="button"
              className="btn"
              style={softActive(track === "ft")}
              onClick={() => setTrack("ft")}
            >
              Full-time
            </button>
            <button
              type="button"
              className="btn"
              style={softActive(track === "all")}
              onClick={() => setTrack("all")}
            >
              All tracks
            </button>
          </div>
        </aside>

        <div className="gcal-main">
          <div className="gcal-topbar">
            <button type="button" className="btn" onClick={() => setCursor(today)}>
              Today
            </button>
            <button
              type="button"
              className="btn"
              aria-label="Previous"
              onClick={() => setCursor(shiftCursor(cursor, calMode, -1))}
            >
              ‹
            </button>
            <button
              type="button"
              className="btn"
              aria-label="Next"
              onClick={() => setCursor(shiftCursor(cursor, calMode, 1))}
            >
              ›
            </button>
            <h2 className="gcal-period-label">
              {showCalendar
                ? cursorLabel(cursor, calMode)
                : view === "deadlines"
                  ? "Upcoming deadlines"
                  : "Agenda"}
            </h2>
            <div className="gcal-view-switch" role="tablist">
              {(
                [
                  ["week", "Week"],
                  ["month", "Month"],
                  ["day", "Day"],
                  ["agenda", "Agenda"],
                  ["deadlines", "Deadlines"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="btn"
                  style={softActive(view === id)}
                  onClick={() => setView(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {showCalendar ? (
            <>
              <CalendarBoard
                mode={calMode}
                cursor={cursor}
                events={filtered}
                schoolColorIndex={schoolIndex}
                onSelectDate={(iso) => setCursor(iso)}
                onOpenDay={(iso) => {
                  setCursor(iso);
                  setView("day");
                }}
              />

              {view !== "day" && view !== "week" ? (
                <Sheet className="hub-day-sheet">
                  <div className="planner-bar soft" style={{ display: "block" }}>
                    <span>{formatDayHeading(cursor)}</span>
                  </div>
                  <div className="planner-grid joined">
                    {selectedDay.length === 0 ? (
                      <div className="planner-row" style={{ gridTemplateColumns: "1fr" }}>
                        <div className="planner-cell" style={{ padding: "0.55rem 0.65rem" }}>
                          <span className="muted">Nothing on this day.</span>
                        </div>
                      </div>
                    ) : (
                      selectedDay.map((ev) => (
                        <div
                          key={ev.id}
                          className="planner-row"
                          style={{ gridTemplateColumns: "18% 1fr" }}
                        >
                          <div className="planner-label-cell">{eventTimeLabel(ev)}</div>
                          <div className="planner-cell" style={{ padding: "0.4rem 0.55rem" }}>
                            <strong>{ev.title}</strong>
                            {ev.detail ? <p className="hint">{ev.detail}</p> : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Sheet>
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
                  <Sheet key={date}>
                    <div
                      className={`planner-bar${isToday ? "" : " soft"}`}
                      style={{ gridTemplateColumns: "1fr auto" }}
                    >
                      <span>
                        {formatDayHeading(date)}
                        {dueIn > 0 ? ` · in ${dueIn}d` : ""}
                        {dueIn === 0 ? " · today" : ""}
                      </span>
                      <span>{isToday ? "Today" : formatShortDate(date)}</span>
                    </div>
                    <div className="planner-grid joined">
                      {events.map((ev) => (
                        <div
                          key={ev.id}
                          className="planner-row"
                          style={{ gridTemplateColumns: "18% 1fr" }}
                        >
                          <div className="planner-label-cell">{eventTimeLabel(ev)}</div>
                          <div className="planner-cell" style={{ padding: "0.4rem 0.55rem" }}>
                            <strong>{ev.title}</strong>
                            {ev.detail ? <p className="hint">{ev.detail}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Sheet>
                );
              })}
            </div>
          )}
        </div>
      </div>

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
              ...data.schools.map((s) => ({
                value: `school:${s.id}`,
                label: s.shortName || s.name,
              })),
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
          const schoolMatch = /^school:(.+)$/.exec(v.kind || "");
          const schoolId = schoolMatch?.[1];
          const school = schoolId
            ? data.schools.find((s) => s.id === schoolId)
            : undefined;
          const kindVal = school
            ? ("meeting" as EventKind)
            : ((v.kind || "deadline") as EventKind);
          const isBreak = kindVal === "personal" && !school;
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
            module: school
              ? school.shortName || school.name
              : isBreak
                ? "Break"
                : "Added by you",
            link: v.link || undefined,
            linkedMeetingId: v.linkedMeetingId || undefined,
            schoolId: school?.id,
            source: school ? "school" : kindVal === "itap" ? "qts" : "personal",
          });
        }}
      />
    </PaperPage>
  );
}
