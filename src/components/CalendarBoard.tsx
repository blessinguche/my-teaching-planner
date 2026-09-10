import { useEffect, useState, type MouseEvent } from "react";
import { addDays, todayISO } from "../data/dates";
import {
  eventCalendarSource,
  isAllDayEvent,
  parseTimeToMinutes,
  SOURCE_COLORS,
  schoolSwatch,
} from "../data/calendarSources";
import { useStore } from "../data/store";
import { timetableSlotIdsFromEventId } from "../data/timetableEvents";
import type { EventKind, PlannerEvent } from "../data/types";

export function eventCoversDate(ev: PlannerEvent, iso: string) {
  const end = ev.endDate ?? ev.date;
  return ev.date <= iso && iso <= end;
}

export function eventsForDate(events: PlannerEvent[], iso: string) {
  return events
    .filter((e) => eventCoversDate(e, iso))
    .sort((a, b) => a.start.localeCompare(b.start));
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthMatrix(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const start = new Date(year, monthIndex, 1 - startOffset);
  const weeks: string[][] = [];
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
    weeks.push(row);
  }
  return weeks;
}

const DAY_START_MIN = 7 * 60; // 07:00
const DAY_END_MIN = 18 * 60; // 18:00
const HOUR_PX = 52;
const GRID_TOP_PAD = 14;

/** Pack overlapping timed events into side-by-side columns. */
function layoutTimedEvents(events: PlannerEvent[]) {
  const items = events
    .map((event) => {
      const start = Math.max(
        parseTimeToMinutes(event.start || "09:00"),
        DAY_START_MIN,
      );
      const endRaw = parseTimeToMinutes(event.end || event.start || "10:00");
      const end = Math.max(endRaw, start + 30);
      return { event, start, end };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const colEnds: number[] = [];
  const placed: { event: PlannerEvent; start: number; end: number; col: number }[] =
    [];

  for (const item of items) {
    let col = colEnds.findIndex((end) => end <= item.start);
    if (col < 0) {
      col = colEnds.length;
      colEnds.push(item.end);
    } else {
      colEnds[col] = item.end;
    }
    placed.push({ ...item, col });
  }

  return placed.map((p) => {
    const overlapping = placed.filter((o) => o.start < p.end && o.end > p.start);
    const colCount = Math.max(...overlapping.map((o) => o.col), p.col) + 1;
    return { event: p.event, start: p.start, end: p.end, col: p.col, colCount };
  });
}

function eventToneClass(ev: PlannerEvent): string {
  if (ev.kind === "deadline" || ev.isAssessment) return "is-deadline";
  if (ev.module === "Break") return "is-break";
  return "is-qts";
}

function eventTimeRangeLabel(ev: PlannerEvent) {
  if (isAllDayEvent(ev)) {
    if (ev.endDate && ev.endDate !== ev.date) {
      return `All day · ${ev.date} – ${ev.endDate}`;
    }
    return `All day · ${ev.date}`;
  }
  if (ev.end && ev.end !== ev.start) return `${ev.date} · ${ev.start}–${ev.end}`;
  return `${ev.date} · ${ev.start}`;
}

type EventMutability = "full" | "timetable" | "homework" | "readonly";

function eventMutability(ev: PlannerEvent): EventMutability {
  if (ev.id.startsWith("tt:")) return "timetable";
  if (ev.id.startsWith("hw-")) return "homework";
  if (ev.id.startsWith("closure-")) return "readonly";
  if (ev.id.startsWith("evt-")) return "full";
  return "readonly";
}

function classNameFromTimetableTitle(title: string) {
  return title;
}

export function EventDetailPopup({
  event,
  accent,
  onClose,
}: {
  event: PlannerEvent;
  accent: string;
  onClose: () => void;
}) {
  const {
    data,
    updateEvent,
    deleteEvent,
    patchData,
    deleteHomework,
  } = useStore();
  const mode = eventMutability(event);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(() =>
    mode === "timetable" ? classNameFromTimetableTitle(event.title) : event.title,
  );
  const [date, setDate] = useState(event.date);
  const [start, setStart] = useState(event.start);
  const [end, setEnd] = useState(event.end);
  const [detail, setDetail] = useState(event.detail ?? "");
  const [kind, setKind] = useState<string>(() =>
    event.schoolId ? `school:${event.schoolId}` : event.kind,
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function saveEdits() {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    if (mode === "full") {
      const schoolMatch = /^school:(.+)$/.exec(kind);
      const schoolId = schoolMatch?.[1];
      const school = schoolId
        ? data.schools.find((s) => s.id === schoolId)
        : undefined;
      const nextKind = (school
        ? "meeting"
        : kind === "meeting" ||
            kind === "itap" ||
            kind === "personal" ||
            kind === "deadline"
          ? kind
          : "meeting") as EventKind;
      updateEvent(event.id, {
        title: nextTitle,
        date,
        start: start || "09:00",
        end: end || start || "09:00",
        detail: detail.trim() || undefined,
        kind: nextKind,
        isAssessment: nextKind === "deadline",
        schoolId: school?.id,
        source: school ? "school" : nextKind === "itap" ? "qts" : "personal",
        module: school
          ? school.shortName || school.name
          : nextKind === "personal"
            ? "Break"
            : event.module ?? "Added by you",
      });
      onClose();
      return;
    }

    if (mode === "homework") {
      const hwId = event.id.replace(/^hw-/, "");
      patchData((prev) => ({
        ...prev,
        homework: prev.homework.map((h) =>
          h.id === hwId
            ? { ...h, title: nextTitle, dueDate: date || h.dueDate }
            : h,
        ),
      }));
      onClose();
      return;
    }

    if (mode === "timetable") {
      const slotIds = new Set(timetableSlotIdsFromEventId(event.id));
      patchData((prev) => ({
        ...prev,
        timetable: prev.timetable.map((t) =>
          slotIds.has(t.id) ? { ...t, className: nextTitle } : t,
        ),
      }));
      onClose();
    }
  }

  function removeEvent() {
    if (mode === "full") {
      deleteEvent(event.id);
      onClose();
      return;
    }
    if (mode === "homework") {
      deleteHomework(event.id.replace(/^hw-/, ""));
      onClose();
      return;
    }
    if (mode === "timetable") {
      const slotIds = new Set(timetableSlotIdsFromEventId(event.id));
      patchData((prev) => ({
        ...prev,
        timetable: prev.timetable.map((t) =>
          slotIds.has(t.id) ? { ...t, className: "" } : t,
        ),
      }));
      onClose();
    }
  }

  return (
    <div
      className="gcal-popup-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="gcal-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gcal-popup-title"
        style={{ ["--gcal-accent" as string]: accent }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gcal-popup-accent" aria-hidden />
        <header className="gcal-popup-head">
          <h3 id="gcal-popup-title">
            {editing
              ? mode === "timetable"
                ? "Edit class"
                : "Edit event"
              : event.title}
          </h3>
          <button
            type="button"
            className="btn gcal-popup-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {editing ? (
          <div className="gcal-popup-form">
            <label>
              {mode === "timetable" ? "Class" : "Title"}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>
            {mode === "full" || mode === "homework" ? (
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            ) : null}
            {mode === "full" ? (
              <>
                <div className="gcal-popup-form-row">
                  <label>
                    Start
                    <input
                      type="time"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </label>
                  <label>
                    End
                    <input
                      type="time"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  Type
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="deadline">Deadline</option>
                    <option value="meeting">Meeting</option>
                    <option value="itap">Training / ITAP</option>
                    <option value="personal">Break / personal</option>
                    {data.schools.map((s) => (
                      <option key={s.id} value={`school:${s.id}`}>
                        {s.shortName || s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Notes
                  <textarea
                    rows={3}
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                  />
                </label>
              </>
            ) : null}
            <div className="gcal-popup-actions">
              <button type="button" className="btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={saveEdits}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="gcal-popup-time">{eventTimeRangeLabel(event)}</p>
            {event.detail?.trim() ? (
              <div className="gcal-popup-body">
                <p className="gcal-popup-label">Notes</p>
                <p className="gcal-popup-notes">{event.detail}</p>
              </div>
            ) : null}
            {event.link ? (
              <p className="gcal-popup-link">
                <a href={event.link} target="_blank" rel="noreferrer">
                  Open link
                </a>
              </p>
            ) : null}
            {mode === "readonly" ? (
              <p className="gcal-popup-readonly">
                Programme / school closure events can&apos;t be edited here.
              </p>
            ) : confirmDelete ? (
              <div className="gcal-popup-actions">
                <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                  Keep
                </button>
                <button type="button" className="btn btn-peach" onClick={removeEvent}>
                  Confirm delete
                </button>
              </div>
            ) : (
              <div className="gcal-popup-actions">
                <button type="button" className="btn" onClick={() => setEditing(true)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-peach"
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function eventAccent(ev: PlannerEvent, schoolIndex: Map<string, number>): string {
  const src = eventCalendarSource(ev);
  if (src === "deadlines") return SOURCE_COLORS.deadlines;
  if (src === "qts") return SOURCE_COLORS.qts;
  const schoolId = src.slice("school:".length);
  return schoolSwatch(schoolIndex.get(schoolId) ?? 0);
}

type Props = {
  mode: "month" | "week" | "day";
  cursor: string;
  events: PlannerEvent[];
  onSelectDate: (iso: string) => void;
  onOpenDay?: (iso: string) => void;
  /** School id → palette index for accent colors */
  schoolColorIndex?: Map<string, number>;
  compact?: boolean;
};

export function CalendarBoard({
  mode,
  cursor,
  events,
  onSelectDate,
  onOpenDay,
  schoolColorIndex,
  compact,
}: Props) {
  const today = todayISO();
  const cursorDate = parseISO(cursor);
  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();
  const schoolIndex = schoolColorIndex ?? new Map<string, number>();

  if (mode === "day") {
    const list = eventsForDate(events, cursor);
    return (
      <div className="cal-day-view panel">
        <ul>
          {list.length === 0 ? (
            <li className="muted">Nothing scheduled.</li>
          ) : (
            list.map((ev) => (
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
                  {ev.link ? (
                    <p className="hint">
                      <a href={ev.link} target="_blank" rel="noreferrer">
                        Open link
                      </a>
                    </p>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    );
  }

  if (mode === "week") {
    return (
      <WeekTimeGrid
        cursor={cursor}
        today={today}
        events={events}
        schoolIndex={schoolIndex}
        compact={compact}
        onSelectDate={onSelectDate}
        onOpenDay={onOpenDay}
      />
    );
  }

  const weeks = monthMatrix(year, month);
  return (
    <div className="cal-month panel">
      <div className="cal-dow">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="cal-grid">
        {weeks.flat().map((iso) => {
          const inMonth = parseISO(iso).getMonth() === month;
          const list = eventsForDate(events, iso);
          const isToday = iso === today;
          const isSelected = iso === cursor;
          const hasDeadline = list.some(
            (e) => e.kind === "deadline" || e.isAssessment,
          );
          const hasBreak = list.some((e) => e.module === "Break");
          return (
            <button
              key={iso}
              type="button"
              className={`cal-cell${inMonth ? "" : " muted-month"}${
                isToday ? " is-today" : ""
              }${isSelected ? " is-selected" : ""}${
                hasDeadline ? " has-deadline" : ""
              }${hasBreak ? " has-break" : ""}`}
              onClick={() => onSelectDate(iso)}
              onDoubleClick={() => onOpenDay?.(iso)}
              aria-label={`${iso}, ${list.length} items. Double-click for day view.`}
              title="Click to select · double-click for day view"
            >
              <span className="cal-date">{parseISO(iso).getDate()}</span>
              <span className="cal-dots" aria-hidden>
                {list.slice(0, 3).map((ev) => (
                  <i
                    key={ev.id}
                    className={
                      ev.kind === "deadline" || ev.isAssessment
                        ? "dot deadline"
                        : ev.module === "Break"
                          ? "dot break"
                          : "dot"
                    }
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekTimeGrid({
  cursor,
  today,
  events,
  schoolIndex,
  compact,
  onSelectDate,
  onOpenDay,
}: {
  cursor: string;
  today: string;
  events: PlannerEvent[];
  schoolIndex: Map<string, number>;
  compact?: boolean;
  onSelectDate: (iso: string) => void;
  onOpenDay?: (iso: string) => void;
}) {
  const cursorDate = parseISO(cursor);
  const dow = (cursorDate.getDay() + 6) % 7;
  const weekStart = addDays(cursor, -dow);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from(
    { length: (DAY_END_MIN - DAY_START_MIN) / 60 },
    (_, i) => DAY_START_MIN / 60 + i,
  );
  const gridHeight = hours.length * HOUR_PX + GRID_TOP_PAD;
  const now = new Date();
  const nowIso = todayISO();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow =
    days.includes(nowIso) && nowMin >= DAY_START_MIN && nowMin <= DAY_END_MIN;
  const nowTop =
    GRID_TOP_PAD + ((nowMin - DAY_START_MIN) / 60) * HOUR_PX;
  const [activeEvent, setActiveEvent] = useState<PlannerEvent | null>(null);

  function openEvent(ev: PlannerEvent, e: MouseEvent) {
    e.stopPropagation();
    setActiveEvent(ev);
  }

  return (
    <div className={`gcal-week${compact ? " is-compact" : ""}`}>
      {activeEvent ? (
        <EventDetailPopup
          event={activeEvent}
          accent={eventAccent(activeEvent, schoolIndex)}
          onClose={() => setActiveEvent(null)}
        />
      ) : null}
      <div className="gcal-timed-scroll">
        <div className="gcal-week-sticky">
          <div className="gcal-week-header">
            <div className="gcal-corner" aria-hidden />
            {days.map((iso) => {
              const d = parseISO(iso);
              const isToday = iso === today;
              const isSelected = iso === cursor;
              return (
                <button
                  key={iso}
                  type="button"
                  className={`gcal-day-head${isToday ? " is-today" : ""}${
                    isSelected ? " is-selected" : ""
                  }`}
                  onClick={() => onSelectDate(iso)}
                  onDoubleClick={() => onOpenDay?.(iso)}
                >
                  <span className="gcal-dow">
                    {new Intl.DateTimeFormat("en-GB", { weekday: "short" })
                      .format(d)
                      .toUpperCase()}
                  </span>
                  <span className="gcal-date-num">{d.getDate()}</span>
                </button>
              );
            })}
          </div>

          <div className="gcal-allday-row">
            <div className="gcal-allday-label" aria-hidden={compact || undefined}>
              {compact ? null : "All day"}
            </div>
            {days.map((iso) => {
              const allDay = eventsForDate(events, iso).filter(isAllDayEvent);
              return (
                <div key={iso} className="gcal-allday-cell">
                  {allDay.map((ev) => {
                    const className = `gcal-allday-pill ${eventToneClass(ev)} is-clickable`;
                    const style = {
                      ["--gcal-accent" as string]: eventAccent(ev, schoolIndex),
                    };
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        className={className}
                        style={style}
                        title={ev.title}
                        onClick={(e) => openEvent(ev, e)}
                      >
                        {ev.title}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="gcal-timed-grid" style={{ height: gridHeight }}>
          <div
            className="gcal-time-rail"
            aria-hidden
            style={{ paddingTop: GRID_TOP_PAD }}
          >
            {hours.map((h) => (
              <div key={h} className="gcal-hour-label" style={{ height: HOUR_PX }}>
                {h === 0
                  ? "12 AM"
                  : h < 12
                    ? `${h} AM`
                    : h === 12
                      ? "12 PM"
                      : `${h - 12} PM`}
              </div>
            ))}
          </div>

          {days.map((iso) => {
            const timed = eventsForDate(events, iso).filter((e) => !isAllDayEvent(e));
            return (
              <div
                key={iso}
                className={`gcal-day-col${iso === today ? " is-today" : ""}`}
                style={{ height: gridHeight }}
                onClick={() => onSelectDate(iso)}
                onDoubleClick={() => onOpenDay?.(iso)}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="gcal-hour-line"
                    style={{
                      top: GRID_TOP_PAD + (h - DAY_START_MIN / 60) * HOUR_PX,
                    }}
                  />
                ))}
                {showNow && iso === nowIso ? (
                  <div className="gcal-now-line" style={{ top: nowTop }}>
                    <span className="gcal-now-dot" />
                  </div>
                ) : null}
                {layoutTimedEvents(timed).map(
                  ({ event: ev, start, end, col, colCount }) => {
                  const top =
                    GRID_TOP_PAD + ((start - DAY_START_MIN) / 60) * HOUR_PX + 1;
                  const height = Math.max(
                    ((Math.min(end, DAY_END_MIN) - start) / 60) * HOUR_PX - 3,
                    20,
                  );
                  const gap = 2;
                  const leftPct = (col / colCount) * 100;
                  const widthPct = 100 / colCount;
                  const className = `gcal-event-block ${eventToneClass(ev)} is-clickable`;
                  const style = {
                    top,
                    height,
                    left: `calc(${leftPct}% + ${gap}px)`,
                    width: `calc(${widthPct}% - ${gap * 2}px)`,
                    right: "auto",
                    ["--gcal-accent" as string]: eventAccent(ev, schoolIndex),
                  };
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      className={className}
                      style={style}
                      title={`${ev.start}–${ev.end} ${ev.title}`}
                      onClick={(e) => openEvent(ev, e)}
                    >
                      <strong>{ev.title}</strong>
                      <span>
                        {ev.start}
                        {ev.end && ev.end !== ev.start ? `–${ev.end}` : ""}
                      </span>
                    </button>
                  );
                },
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Mini month used in GCal-style sidebar */
export function MiniMonth({
  cursor,
  onSelectDate,
  onShiftMonth,
}: {
  cursor: string;
  onSelectDate: (iso: string) => void;
  onShiftMonth: (dir: -1 | 1) => void;
}) {
  const today = todayISO();
  const d = parseISO(cursor);
  const year = d.getFullYear();
  const month = d.getMonth();
  const weeks = monthMatrix(year, month);
  const label = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(d);

  return (
    <div className="gcal-mini-month">
      <div className="gcal-mini-nav">
        <button type="button" className="btn" onClick={() => onShiftMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <span>{label}</span>
        <button type="button" className="btn" onClick={() => onShiftMonth(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="gcal-mini-dow">
        {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => (
          <span key={`${x}-${i}`}>{x}</span>
        ))}
      </div>
      <div className="gcal-mini-grid">
        {weeks.flat().map((iso) => {
          const cell = parseISO(iso);
          const inMonth = cell.getMonth() === month;
          return (
            <button
              key={iso}
              type="button"
              className={`gcal-mini-day${!inMonth ? " is-out" : ""}${
                iso === today ? " is-today" : ""
              }${iso === cursor ? " is-selected" : ""}`}
              onClick={() => onSelectDate(iso)}
            >
              {cell.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function shiftCursor(cursor: string, mode: "month" | "week" | "day", dir: -1 | 1) {
  if (mode === "day") return addDays(cursor, dir);
  if (mode === "week") return addDays(cursor, dir * 7);
  const [y, m] = cursor.split("-").map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}

export function cursorLabel(cursor: string, mode: "month" | "week" | "day") {
  const d = parseISO(cursor);
  if (mode === "month") {
    return new Intl.DateTimeFormat("en-GB", {
      month: "long",
      year: "numeric",
    }).format(d);
  }
  if (mode === "week") {
    const dow = (d.getDay() + 6) % 7;
    const start = addDays(cursor, -dow);
    const end = addDays(start, 6);
    return `${start.slice(8)}–${end.slice(8)} ${new Intl.DateTimeFormat("en-GB", {
      month: "short",
      year: "numeric",
    }).format(parseISO(end))}`;
  }
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
