import { useEffect, useId, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const links = [
  {
    to: "/",
    label: "Home",
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M6 10.5V20h12v-9.5" />
      </svg>
    ),
  },
  {
    to: "/planner",
    label: "Plan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    ),
  },
  {
    to: "/todos",
    label: "To-do",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    to: "/deadlines",
    label: "Due",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    to: "/knowledge",
    label: "Learn",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    to: "/practice",
    label: "Quiz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.8 2.1c-.7.5-1.3 1-1.3 2.4" />
        <path d="M12 17h.01" />
      </svg>
    ),
  },
  {
    to: "/resources",
    label: "Links",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4.93" />
        <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19.07" />
      </svg>
    ),
  },
  {
    to: "/capture",
    label: "Capture",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    to: "/account",
    label: "Account",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
      </svg>
    ),
  },
] as const;

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ul className="nav-list">
      {links.map((link) => (
        <li key={link.to}>
          <NavLink
            to={link.to}
            end={"end" in link ? link.end : false}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            onClick={onNavigate}
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function SideNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Desktop / tall: left rail. Short-but-wide: becomes top strip via CSS */}
      <nav className="side-nav side-nav-rail" aria-label="Primary">
        <div className="brand-mark" title="QTS Planner">
          QTS
        </div>
        <NavItems />
      </nav>

      {/* Narrow screens: top bar + burger */}
      <header className="mobile-topbar">
        <button
          type="button"
          className="burger-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`burger-icon${open ? " open" : ""}`} aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </button>
        <div className="mobile-brand">QTS Planner</div>
        <span className="mobile-topbar-spacer" aria-hidden />
      </header>

      {open ? (
        <div
          className="nav-drawer-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <nav
        id={panelId}
        className={`nav-drawer${open ? " open" : ""}`}
        aria-label="Mobile primary"
        aria-hidden={!open}
      >
        <div className="nav-drawer-head">
          <div className="brand-mark">QTS</div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
        <NavItems onNavigate={() => setOpen(false)} />
      </nav>
    </>
  );
}
