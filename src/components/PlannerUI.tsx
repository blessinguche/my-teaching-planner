import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { School } from "../data/types";
import { NoteEditor } from "./NoteEditor";

export function PlannerTopBar({
  school,
  section,
}: {
  school: School;
  section?: string;
}) {
  return (
    <div className="planner-topbar">
      <Link className="hub-back" to="/">
        ← Hub
      </Link>
      <span className="school-chip">{school.name}</span>
      {section ? <span className="school-chip">· {section}</span> : null}
    </div>
  );
}

export function AreaTopBar({
  backTo,
  backLabel,
  title,
}: {
  backTo?: string;
  backLabel?: string;
  title?: string;
}) {
  return (
    <div className="planner-topbar area-topbar">
      {backTo ? (
        <Link className="hub-back" to={backTo}>
          ← {backLabel ?? "Back"}
        </Link>
      ) : null}
      {title ? <span className="school-chip">{title}</span> : null}
    </div>
  );
}

export function PlannerPageShell({
  school,
  section,
  title,
  caption,
  children,
  double,
  backTo,
  backLabel = "Back",
}: {
  school: School;
  section?: string;
  title: string;
  caption?: string;
  children: ReactNode;
  double?: boolean;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="page-enter">
      <PlannerTopBar school={school} section={section} />
      <div className="planner-page">
        <div className="planner-page-head">
          <div className="planner-page-head-main">
            <h1 className="planner-title">{title}</h1>
            {caption ? <p className="planner-caption">{caption}</p> : null}
          </div>
          {backTo ? (
            <Link className="planner-page-back" to={backTo} aria-label={backLabel}>
              ← {backLabel}
            </Link>
          ) : null}
        </div>
        <div className={`planner-spread${double ? " is-double" : ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Hub / QTS paper shell */
export function PaperPage({
  title,
  caption,
  topbar,
  actions,
  children,
  double,
}: {
  title: string;
  caption?: string;
  topbar?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  double?: boolean;
}) {
  return (
    <div className="page-enter">
      {topbar}
      <div className="planner-page">
        <header className="planner-page-head">
          <div>
            <h1 className="planner-title">{title}</h1>
            {caption ? <p className="planner-caption">{caption}</p> : null}
          </div>
          {actions ? <div className="page-actions">{actions}</div> : null}
        </header>
        {double ? (
          <div className="planner-spread is-double">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function PlannerInput({
  value,
  onChange,
  placeholder,
  multiline,
  rows,
  lined,
  grow,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  lined?: boolean;
  /** Auto-expanding textarea that wraps and grows with content. */
  grow?: boolean;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const cls = `planner-input${lined ? " is-lined" : ""}${grow ? " is-grow" : ""}`;

  useEffect(() => {
    if (!grow || !areaRef.current) return;
    const el = areaRef.current;
    el.style.height = "0px";
    el.style.height = `${Math.max(el.scrollHeight, 36)}px`;
  }, [grow, value]);

  if (multiline || grow) {
    return (
      <textarea
        ref={areaRef}
        className={cls}
        value={value}
        rows={grow ? 1 : rows ?? 3}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      className={cls}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function PlannerSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      className="planner-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}

export function PlannerNoteBox({
  label,
  value,
  onChange,
  minHeight,
  name,
}: {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  name: string;
}) {
  return (
    <div className="obs-box planner-lined">
      {label ? <div className="planner-label-cell">{label}</div> : null}
      <NoteEditor
        className="inline-note-editor"
        name={name}
        defaultValue={value}
        minHeight={minHeight ?? 120}
        placeholder="Write here…"
        onChange={onChange}
      />
    </div>
  );
}

export function LabelRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="planner-row label-row">
      <div className="planner-label-cell">{label}</div>
      <div className="planner-cell">{children}</div>
    </div>
  );
}

export function JumpTiles({
  items,
}: {
  items: {
    id: string;
    label: string;
    blurb?: string;
    href?: string;
    onClick?: () => void;
  }[];
}) {
  return (
    <div className="planner-jump">
      {items.map((item) => {
        const body = (
          <>
            {item.label}
            {item.blurb ? <span>{item.blurb}</span> : null}
          </>
        );
        if (item.href) {
          if (item.href.startsWith("/")) {
            return (
              <Link key={item.id} to={item.href}>
                {body}
              </Link>
            );
          }
          return (
            <a key={item.id} href={item.href}>
              {body}
            </a>
          );
        }
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.onClick) {
                item.onClick();
                return;
              }
              document.getElementById(item.id)?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}

export function Sheet({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`planner-sheet${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

/** Paper-style confirm popup for destructive / important actions. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="planner-confirm-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="planner-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="planner-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="planner-confirm-accent" aria-hidden />
        <header className="planner-confirm-head">
          <h3 id="planner-confirm-title">{title}</h3>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <p className="planner-confirm-message">{message}</p>
        <div className="planner-confirm-actions">
          <button type="button" className="btn" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn${danger ? " btn-peach" : " btn-primary"}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
