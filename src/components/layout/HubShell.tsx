import { Outlet } from "react-router-dom";
import { SyncBanner } from "../SyncBanner";
import { SideNavFrame, icons, type NavItem } from "./SideNavFrame";

const hubLinks: NavItem[] = [
  { to: "/", label: "Home", end: true, icon: icons.home },
  { to: "/cal", label: "Cal", icon: icons.cal },
  { to: "/schools", label: "Schools", icon: icons.school },
  { to: "/qts", label: "QTS", icon: icons.qts },
  { to: "/account", label: "Account", icon: icons.account },
];

export function HubShell() {
  return (
    <div className="app-shell">
      <SideNavFrame
        brand="TP"
        brandTitle="Teaching Planner"
        mobileTitle="Teaching Planner"
        links={hubLinks}
        ariaLabel="Hub"
      />
      <main className="main-stage">
        <SyncBanner />
        <Outlet />
      </main>
    </div>
  );
}
