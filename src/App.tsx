import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { AppShell } from "./components/layout/AppShell";
import { AccountPage } from "./pages/AccountPage";
import { DashboardPage } from "./pages/DashboardPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { CapturePage } from "./pages/CapturePage";
import { DeadlinesPage } from "./pages/DeadlinesPage";
import { PracticePage } from "./pages/PracticePage";
import { PlannerPage } from "./pages/PlannerPage";
import { ResourcesPage } from "./pages/ResourcesPage";
import { TodosPage } from "./pages/TodosPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public: sign in only — no planner data */}
          <Route path="account" element={<AccountPage />} />

          {/* Private: data loads only after auth */}
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="planner" element={<PlannerPage />} />
              <Route path="todos" element={<TodosPage />} />
              <Route path="deadlines" element={<DeadlinesPage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="practice" element={<PracticePage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="capture" element={<CapturePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
