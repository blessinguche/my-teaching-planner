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
    { to: `${base}/timetable`, label: "Times", icon: icons.timetable },
    { to: `${base}/notes`, label: "Notes", icon: icons.comms },
    { to: `${base}/focus`, label: "Focus", icon: icons.qts },
    { to: `${base}/calendar`, label: "Cal", icon: icons.cal },
    { to: `${base}/planning`, label: "Plan", icon: icons.lesson },
    { to: `${base}/training`, label: "Training", icon: icons.goals },
    { to: `${base}/records`, label: "Records", icon: icons.grades },
    { to: "/", label: "Hub", icon: icons.back },
  ];

  return (
    <div className="app-shell">
      <SideNavFrame
        brand={school.shortName.slice(0, 2).toUpperCase()}
        brandTitle={school.name}
        mobileTitle={school.shortName}
        links={links}
        ariaLabel={`${school.shortName} school`}
        homeTo={base}
        homeLabel={`${school.shortName} home`}
      />
      <main className="main-stage">
        <SyncBanner />
        <Outlet context={{ school }} />
      </main>
    </div>
  );
}
