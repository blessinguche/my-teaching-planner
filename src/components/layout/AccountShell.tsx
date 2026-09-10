import { Outlet } from "react-router-dom";
import { SideNavFrame, icons, type NavItem } from "./SideNavFrame";

const accountLinks: NavItem[] = [
  { to: "/", label: "Home", end: true, icon: icons.home },
  { to: "/cal", label: "Cal", icon: icons.cal },
  { to: "/schools", label: "Schools", icon: icons.school },
  { to: "/qts", label: "QTS", icon: icons.qts },
  { to: "/account", label: "Account", icon: icons.account },
];

/** Hub chrome for /account (no store / SyncBanner — works signed out). */
export function AccountShell() {
  return (
    <div className="app-shell">
      <SideNavFrame
        brand="TP"
        brandTitle="Teaching Planner"
        mobileTitle="Teaching Planner"
        links={accountLinks}
        ariaLabel="Hub"
        homeTo="/"
        homeLabel="Hub home"
      />
      <main className="main-stage">
        <Outlet />
      </main>
    </div>
  );
}
