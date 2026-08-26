import { useMemo, useState } from "react";
import { AddButton, AddDialog, PageHeader } from "../components/AddDialog";
import { formatShortDate, todayISO, useStore } from "../data/store";
import type { TaskItem } from "../data/types";

type Filter = "open" | "done" | "all";

export function TodosPage() {
  const { data, toggleTask, addTask, updateTask, deleteTask } = useStore();
  const [filter, setFilter] = useState<Filter>("open");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);
  const today = todayISO();

  const items = useMemo(() => {
    let list = [...data.tasks];
    if (filter === "open") list = list.filter((t) => !t.done);
    if (filter === "done") list = list.filter((t) => t.done);
    return list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const ad = a.dueDate ?? "9999";
      const bd = b.dueDate ?? "9999";
      return ad.localeCompare(bd) || a.label.localeCompare(b.label);
    });
  }, [data.tasks, filter]);

  const openCount = data.tasks.filter((t) => !t.done).length;

  return (
    <div className="module-page page-enter">
      <PageHeader
        eyebrow="Action list"
        title="To-do"
        blurb="Click a task to edit notes, due date, or delete it."
        actions={<AddButton label="Task" onClick={() => setAddOpen(true)} />}
      />

      <div className="dash-grid" style={{ marginBottom: "1rem" }}>
        <section className="panel clay-panel span-4">
          <div className="learn-badge">{openCount}</div>
          <p className="muted">open tasks</p>
        </section>
        <section className="panel clay-panel span-4">
          <div className="learn-badge" style={{ background: "var(--mint-soft)" }}>
            {
              data.tasks.filter(
                (t) => !t.done && t.dueDate && t.dueDate <= today,
              ).length
            }
          </div>
          <p className="muted">due today or overdue</p>
        </section>
        <section className="panel clay-panel span-4">
          <div className="learn-badge" style={{ background: "var(--butter)" }}>
            {data.tasks.filter((t) => t.done).length}
          </div>
          <p className="muted">done</p>
        </section>
      </div>

      <div className="tab-row" style={{ marginBottom: "1rem" }}>
        {(
          [
            ["open", "Open"],
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

      <ul className="todo-page-list">
        {items.map((todo) => {
          const overdue = !todo.done && !!todo.dueDate && todo.dueDate < today;
          const dueToday =
            !todo.done && !!todo.dueDate && todo.dueDate === today;
          return (
            <li
              key={todo.id}
              className={`panel todo-page-item clickable${todo.done ? " done" : ""}${
                overdue ? " overdue" : ""
              }`}
            >
              <button
                type="button"
                className={`todo-check${todo.done ? " done" : ""}`}
                aria-label={todo.done ? "Mark not done" : "Mark done"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTask(todo.id);
                }}
              />
              <button
                type="button"
                className="todo-page-main as-button"
                onClick={() => setEditing(todo)}
              >
                <strong>{todo.label}</strong>
                {todo.dueDate ? (
                  <p className={`hint${overdue || dueToday ? " hot" : ""}`}>
                    Due {formatShortDate(todo.dueDate)}
                    {overdue ? " · overdue" : dueToday ? " · today" : ""}
                  </p>
                ) : (
                  <p className="hint">No due date</p>
                )}
                {todo.notes ? (
                  <p className="hint notes-preview">{todo.notes}</p>
                ) : (
                  <p className="hint">Tap to add notes…</p>
                )}
              </button>
            </li>
          );
        })}
        {items.length === 0 ? (
          <p className="muted">Nothing in this filter.</p>
        ) : null}
      </ul>

      <AddDialog
        open={addOpen}
        title="Add task"
        fields={[
          { name: "label", label: "Task", required: true },
          { name: "dueDate", label: "Due date", type: "date" },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onClose={() => setAddOpen(false)}
        onSubmit={(v) =>
          addTask({
            label: v.label,
            dueDate: v.dueDate || undefined,
            notes: v.notes,
          })
        }
      />

      <AddDialog
        open={!!editing}
        formKey={editing?.id}
        title="Edit task"
        submitLabel="Save"
        fields={[
          {
            name: "label",
            label: "Task",
            required: true,
            defaultValue: editing?.label,
          },
          {
            name: "dueDate",
            label: "Due date",
            type: "date",
            defaultValue: editing?.dueDate ?? "",
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            defaultValue: editing?.notes ?? "",
            placeholder: "Progress, links, reminders…",
          },
        ]}
        onClose={() => setEditing(null)}
        onDelete={
          editing ? () => deleteTask(editing.id) : undefined
        }
        onSubmit={(v) => {
          if (!editing) return;
          updateTask(editing.id, {
            label: v.label,
            dueDate: v.dueDate || undefined,
            notes: v.notes || "",
          });
        }}
      />
    </div>
  );
}
