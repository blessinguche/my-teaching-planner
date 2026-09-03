import { useState } from "react";
import { Link } from "react-router-dom";
import { AddDialog } from "../components/AddDialog";
import { getRememberOfDay } from "../data/remember";
import { countDue } from "../data/srs";
import {
  formatShortDate,
  todayISO,
  useStore,
} from "../data/store";

function formatToday() {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function daysUntil(iso: string, today: string) {
  const [y1, m1, d1] = today.split("-").map(Number);
  const [y2, m2, d2] = iso.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

export function DashboardPage() {
  const { data, toggleTask, addTask, addReminder } = useStore();
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addRemOpen, setAddRemOpen] = useState(false);
  const today = todayISO();

  const todayEvents = data.events
    .filter((e) => {
      if (e.date !== today) return false;
      const t = e.track ?? "all";
      return t !== "pt" && t !== "extension";
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  const topTodos = data.tasks
    .filter((t) => !t.done)
    .sort((a, b) => {
      const ad = a.dueDate ?? "9999";
      const bd = b.dueDate ?? "9999";
      return ad.localeCompare(bd);
    })
    .slice(0, 4);

  const upcomingAssessments = data.assessments
    .filter((a) => !a.done && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  const upcoming = data.events
    .filter((e) => {
      if (e.date <= today) return false;
      const t = e.track ?? "all";
      if (t === "pt" || t === "extension") return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    .slice(0, 4);

  const reminder = getRememberOfDay(data);
  const dueReviews = countDue(data);
  const openTaskCount = data.tasks.filter((t) => !t.done).length;

  return (
    <div className="page-enter">
      <header className="dash-header">
        <div>
          <p className="eyebrow">QTS · NIoT 2026–27</p>
          <h1>{formatToday()}</h1>
          <p className="subtitle">What do I need to do?</p>
        </div>
        <div className="page-actions">
          <Link to="/qts/todos" className="btn btn-primary btn-clay">
            All to-dos
          </Link>
          <Link to="/qts/deadlines" className="btn btn-peach btn-clay">
            Deadlines
          </Link>
        </div>
      </header>

      <div className="home-grid">
        {/* Row 1 */}
        <section className="home-cell home-remember">
          <div className="day-sheet-head">
            <h2 className="panel-title" style={{ marginBottom: 0 }}>
              Remember
            </h2>
            <button
              type="button"
              className="btn"
              aria-label="Add reminder"
              onClick={() => setAddRemOpen(true)}
            >
              +
            </button>
          </div>
          <p className="remember-quote">“{reminder}”</p>
          <p className="hint">Rotates daily from pins + glossary</p>
        </section>

        <section className="home-cell panel">
          <h2 className="panel-title">Learn</h2>
          <div className="learn-badge">{dueReviews}</div>
          <p className="muted">cards due for recall</p>
          <Link
            to="/qts/practice"
            className="btn btn-primary btn-clay"
            style={{ marginTop: "0.85rem" }}
          >
            Test me
          </Link>
        </section>

        {/* Row 2 */}
        <section className="home-cell panel">
          <div className="day-sheet-head">
            <h2 className="panel-title" style={{ marginBottom: 0 }}>
              Today
            </h2>
            <Link to="/cal" className="hint">
              Calendar →
            </Link>
          </div>
          {todayEvents.length === 0 ? (
            <p className="muted">No sessions on the calendar for today.</p>
          ) : (
            <ul>
              {todayEvents.map((item) => (
                <li
                  key={item.id}
                  className={`timeline-item${
                    item.kind === "deadline" || item.isAssessment
                      ? " is-deadline"
                      : ""
                  }`}
                >
                  <span
                    className={`time-pill${
                      item.kind === "deadline" || item.isAssessment
                        ? " deadline"
                        : ""
                    }`}
                  >
                    {item.kind === "deadline" || item.isAssessment
                      ? "DUE"
                      : item.start}
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    {item.detail ? <p className="hint">{item.detail}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="home-cell panel">
          <div className="day-sheet-head">
            <h2 className="panel-title" style={{ marginBottom: 0 }}>
              Do
            </h2>
            <Link to="/qts/todos" className="hint">
              See all ({openTaskCount}) →
            </Link>
          </div>
          {topTodos.length === 0 ? (
            <p className="muted">All caught up.</p>
          ) : (
            <ul>
              {topTodos.map((todo) => (
                <li key={todo.id} className="todo-item">
                  <button
                    type="button"
                    className={`todo-check${todo.done ? " done" : ""}`}
                    aria-label={`Mark ${todo.label} done`}
                    onClick={() => toggleTask(todo.id)}
                  />
                  <div>
                    <span>{todo.label}</span>
                    {todo.dueDate ? (
                      <p className="hint">Due {formatShortDate(todo.dueDate)}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn"
            style={{ marginTop: "0.75rem" }}
            onClick={() => setAddTaskOpen(true)}
          >
            + Add task
          </button>
        </section>

        {/* Row 3 */}
        <section className="home-cell panel">
          <div className="day-sheet-head">
            <h2 className="panel-title" style={{ marginBottom: 0 }}>
              Coming up
            </h2>
            <Link to="/cal" className="hint">
              Calendar →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted">Nothing further on the calendar.</p>
          ) : (
            <ul>
              {upcoming.map((item) => (
                <li
                  key={item.id}
                  className={`upcoming-item${
                    item.kind === "deadline" || item.isAssessment
                      ? " is-deadline"
                      : ""
                  }`}
                >
                  <span
                    className={`time-pill${
                      item.kind === "deadline" || item.isAssessment
                        ? " deadline"
                        : ""
                    }`}
                  >
                    {formatShortDate(item.date)}
                  </span>
                  <div>
                    <strong>
                      {item.title.length > 70
                        ? `${item.title.slice(0, 70)}…`
                        : item.title}
                    </strong>
                    <p className="hint">
                      {item.kind === "deadline" || item.isAssessment
                        ? "Deadline"
                        : `${item.start}–${item.end}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="home-cell panel">
          <div className="day-sheet-head">
            <h2 className="panel-title" style={{ marginBottom: 0 }}>
              Assessments
            </h2>
            <Link to="/qts/deadlines" className="hint">
              See all →
            </Link>
          </div>
          {upcomingAssessments.length === 0 ? (
            <p className="muted">No open assessments ahead.</p>
          ) : (
            <ul>
              {upcomingAssessments.map((item) => {
                const d = daysUntil(item.date, today);
                return (
                  <li key={item.id} className="upcoming-item">
                    <span className="time-pill deadline">
                      {d === 0 ? "Today" : `${d}d`}
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p className="hint">
                        {formatShortDate(item.date)} · {item.type}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <AddDialog
        open={addTaskOpen}
        title="Add task"
        fields={[
          {
            name: "label",
            label: "Task",
            required: true,
            placeholder: "What needs doing?",
          },
          { name: "dueDate", label: "Due date", type: "date" },
        ]}
        onClose={() => setAddTaskOpen(false)}
        onSubmit={(v) =>
          addTask({ label: v.label, dueDate: v.dueDate || undefined })
        }
      />
      <AddDialog
        open={addRemOpen}
        title="Add reminder"
        fields={[
          {
            name: "text",
            label: "Remember",
            type: "textarea",
            required: true,
            placeholder: "Mentor tip / teaching gem…",
          },
        ]}
        onClose={() => setAddRemOpen(false)}
        onSubmit={(v) => addReminder({ text: v.text })}
      />
    </div>
  );
}
