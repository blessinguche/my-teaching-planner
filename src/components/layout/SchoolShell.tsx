import { Navigate, Outlet, useParams } from "react-router-dom";
import { SyncBanner } from "../SyncBanner";
import { useStore } from "../../data/store";
import { SideNavFrame, icons, type NavItem } from "./SideNavFrame";

export function SchoolShell() {
  const { schoolId } = useParams();
  const { data } = useStore();
  const school = data.schools.find((s) => s.id === schoolId);

  if (!schoolId || !school) {
    return <Navigate to="/schools" replace />;
  }

  const base = `/school/${schoolId}`;
  const links: NavItem[] = [
    { to: base, label: "Home", end: true, icon: icons.home },
    { to: `${base}/terms`, label: "Terms", icon: icons.terms },
    { to: `${base}/timetable`, label: "Times", icon: icons.timetable },
    { to: `${base}/lessons`, label: "Lessons", icon: icons.lesson },
    { to: `${base}/roster`, label: "Roster", icon: icons.people },
    { to: `${base}/attendance`, label: "Attend", icon: icons.attend },
    { to: `${base}/grades`, label: "Grades", icon: icons.grades },
    { to: `${base}/behaviour`, label: "Behav", icon: icons.behaviour },
    { to: `${base}/homework`, label: "HW", icon: icons.homework },
    { to: `${base}/comms`, label: "Comms", icon: icons.comms },
    { to: `${base}/contacts`, label: "Contacts", icon: icons.people },
    { to: `${base}/todos`, label: "To-do", icon: icons.todo },
    { to: `${base}/goals`, label: "Goals", icon: icons.goals },
    { to: `${base}/pd`, label: "PD", icon: icons.pd },
    { to: `${base}/supplies`, label: "Stock", icon: icons.supplies },
    { to: `${base}/projects`, label: "Projects", icon: icons.project },
    { to: `${base}/birthdays`, label: "Dates", icon: icons.cake },
    { to: "/schools", label: "Schools", icon: icons.back },
  ];

  return (
    <div className="app-shell">
      <SideNavFrame
        brand={school.shortName.slice(0, 2).toUpperCase()}
        brandTitle={school.name}
        mobileTitle={school.shortName}
        links={links}
        ariaLabel={`${school.shortName} school`}
      />
      <main className="main-stage">
        <SyncBanner />
        <Outlet context={{ school }} />
      </main>
    </div>
  );
}
