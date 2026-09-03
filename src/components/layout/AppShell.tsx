import { Outlet } from "react-router-dom";
import { SyncBanner } from "../SyncBanner";
import { SideNav } from "./SideNav";

export function AppShell() {
  return (
    <div className="app-shell">
      <SideNav />
      <main className="main-stage">
        <SyncBanner />
        <Outlet />
      </main>
    </div>
  );
}
