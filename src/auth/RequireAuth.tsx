import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { DataProvider } from "../data/store";

/** Blocks the app until signed in — no planner data without an account. */
export function RequireAuth() {
  const { configured, ready, user } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="module-page" style={{ padding: "2rem" }}>
        <p className="muted">Checking sign-in…</p>
      </div>
    );
  }

  if (!configured) {
    return <Navigate to="/account" replace state={{ from: location }} />;
  }

  if (!user) {
    return <Navigate to="/account" replace state={{ from: location }} />;
  }

  return (
    <DataProvider key={user.id} userId={user.id}>
      <Outlet />
    </DataProvider>
  );
}
