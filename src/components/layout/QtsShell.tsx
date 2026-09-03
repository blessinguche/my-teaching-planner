import { Outlet } from "react-router-dom";
import { SyncBanner } from "../SyncBanner";
import { SideNavFrame, icons, type NavItem } from "./SideNavFrame";

const qtsLinks: NavItem[] = [
  { to: "/qts", label: "Home", end: true, icon: icons.home },
  { to: "/qts/todos", label: "To-do", icon: icons.todo },
  { to: "/qts/deadlines", label: "Due", icon: icons.due },
  { to: "/qts/knowledge", label: "Learn", icon: icons.qts },
  { to: "/qts/practice", label: "Quiz", icon: icons.quiz },
  { to: "/qts/resources", label: "Links", icon: icons.links },
  { to: "/qts/capture", label: "Capture", icon: icons.capture },
  { to: "/", label: "Hub", icon: icons.back },
];

export function QtsShell() {
  return (
    <div className="app-shell">
      <SideNavFrame
        brand="QTS"
        brandTitle="QTS training"
        mobileTitle="QTS training"
        links={qtsLinks}
        ariaLabel="QTS"
      />
      <main className="main-stage">
        <SyncBanner />
        <Outlet />
      </main>
    </div>
  );
}
