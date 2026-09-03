import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { NoteEditor, StudentPicker } from "./NoteEditor";

type Field =
  | {
      name: string;
      label: string;
      type?: "text" | "date" | "time" | "url" | "select";
      required?: boolean;
      placeholder?: string;
      options?: { value: string; label: string }[];
      defaultValue?: string;
      hint?: string;
    }
  | {
      name: string;
      label: string;
      type: "textarea";
      required?: boolean;
      placeholder?: string;
      defaultValue?: string;
      hint?: string;
    }
  | {
      name: string;
      label: string;
      type: "file";
      required?: boolean;
      accept?: string;
      hint?: string;
    }
  | {
      name: string;
      label: string;
      type: "student";
      students: { id: string; name: string; yearGroup?: string; form?: string }[];
      allowNone?: boolean;
      noneLabel?: string;
      required?: boolean;
      defaultValue?: string;
      hint?: string;
    };

type Props = {
  open: boolean;
  title: string;
  description?: string;
  fields: Field[];
  submitLabel?: string;
  formKey?: string;
  children?: ReactNode;
  onClose: () => void;
  onSubmit: (
    values: Record<string, string>,
    files: Record<string, File | null>,
  ) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  deleteLabel?: string;
};

export function AddDialog({
  open,
  title,
  description,
  fields,
  submitLabel = "Add",
  formKey,
  children,
  onClose,
  onSubmit,
  onDelete,
  deleteLabel = "Delete",
}: Props) {
  const titleId = useId();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      const el = formRef.current?.querySelector<HTMLElement>(
        "input, textarea, select",
      );
      el?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, formKey, busy]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    // Flush rich editors before reading FormData
    form.querySelectorAll<HTMLElement>(".note-surface").forEach((surface) => {
      surface.dispatchEvent(new Event("blur", { bubbles: true }));
    });
    const fd = new FormData(form);
    const values: Record<string, string> = {};
    const files: Record<string, File | null> = {};
    for (const field of fields) {
      if (field.type === "file") {
        const entry = fd.get(field.name);
        files[field.name] =
          entry instanceof File && entry.size > 0 ? entry : null;
      } else {
        const raw = fd.get(field.name);
        values[field.name] = String(raw ?? "").trim();
      }
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values, files);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={() => !busy && onClose()}
    >
      <div
        className="dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dialog-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p className="muted">{description}</p> : null}
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <form
          key={formKey ?? "form"}
          ref={formRef}
          className="dialog-form"
          onSubmit={handleSubmit}
        >
          {children}
          {fields.map((field) => (
            <label key={field.name} className="field">
              <span>
                {field.label}
                {field.required ? " *" : ""}
              </span>
              {field.type === "textarea" ? (
                <NoteEditor
                  name={field.name}
                  required={field.required}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue}
                  disabled={busy}
                />
              ) : field.type === "student" ? (
                <StudentPicker
                  name={field.name}
                  students={field.students}
                  allowNone={field.allowNone}
                  noneLabel={field.noneLabel}
                  required={field.required}
                  defaultValue={field.defaultValue}
                  disabled={busy}
                />
              ) : field.type === "select" ? (
                <select
                  name={field.name}
                  required={field.required}
                  defaultValue={field.defaultValue ?? field.options?.[0]?.value}
                  disabled={busy}
                >
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "file" ? (
                <input
                  name={field.name}
                  type="file"
                  required={field.required}
                  accept={field.accept}
                  disabled={busy}
                />
              ) : (
                <input
                  name={field.name}
                  type={field.type ?? "text"}
                  required={field.required}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue}
                  disabled={busy}
                />
              )}
              {"hint" in field && field.hint ? (
                <span className="field-hint">{field.hint}</span>
              ) : null}
            </label>
          ))}
          {error ? <p className="form-error">{error}</p> : null}
          <div className="dialog-actions">
            {onDelete ? (
              <button
                type="button"
                className="btn btn-danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await onDelete();
                    onClose();
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Delete failed.",
                    );
                    setBusy(false);
                  }
                }}
              >
                {deleteLabel}
              </button>
            ) : null}
            <div className="dialog-actions-right">
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-clay"
                disabled={busy}
              >
                {busy ? "Saving…" : submitLabel}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="btn btn-primary btn-clay add-btn"
      onClick={onClick}
    >
      <span aria-hidden>+</span> {label}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  blurb,
  actions,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head page-head-row">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {blurb ? <p className="muted">{blurb}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
