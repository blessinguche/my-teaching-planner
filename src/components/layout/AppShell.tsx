import { Outlet } from "react-router-dom";
import { SideNav } from "./SideNav";

export function AppShell() {
  return (
    <div className="app-shell">
      <SideNav />
      <main className="main-stage">
        <Outlet />
      </main>
    </div>
  );
}
