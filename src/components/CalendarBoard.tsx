import { addDays, todayISO } from "../data/dates";
import type { PlannerEvent } from "../data/types";

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

type Props = {
  mode: "month" | "week" | "day";
  cursor: string; // YYYY-MM-DD
  events: PlannerEvent[];
  onSelectDate: (iso: string) => void;
};

export function CalendarBoard({ mode, cursor, events, onSelectDate }: Props) {
  const today = todayISO();
  const cursorDate = parseISO(cursor);
  const year = cursorDate.getFullYear();
  const month = cursorDate.getMonth();

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
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    );
  }

  if (mode === "week") {
    const dow = (cursorDate.getDay() + 6) % 7;
    const weekStart = addDays(cursor, -dow);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <div className="cal-week panel">
        {days.map((iso) => {
          const list = eventsForDate(events, iso).slice(0, 6);
          const isToday = iso === today;
          const isSelected = iso === cursor;
          return (
            <button
              key={iso}
              type="button"
              className={`cal-week-col${isToday ? " is-today" : ""}${
                isSelected ? " is-selected" : ""
              }`}
              onClick={() => onSelectDate(iso)}
            >
              <div className="cal-week-head">
                {new Intl.DateTimeFormat("en-GB", {
                  weekday: "short",
                  day: "numeric",
                }).format(parseISO(iso))}
              </div>
              <ul>
                {list.map((ev) => (
                  <li
                    key={ev.id}
                    className={`cal-chip${
                      ev.kind === "deadline" || ev.isAssessment
                        ? " deadline"
                        : ev.module === "Break"
                          ? " break"
                          : ""
                    }`}
                  >
                    {ev.title.length > 42 ? `${ev.title.slice(0, 42)}…` : ev.title}
                  </li>
                ))}
                {list.length === 0 ? (
                  <li className="hint">—</li>
                ) : null}
              </ul>
            </button>
          );
        })}
      </div>
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
              aria-label={`${iso}, ${list.length} items`}
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
