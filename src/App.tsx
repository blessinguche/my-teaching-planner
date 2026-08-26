import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { AppShell } from "./components/layout/AppShell";
import { DataProvider } from "./data/store";
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
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="planner" element={<PlannerPage />} />
              <Route path="todos" element={<TodosPage />} />
              <Route path="deadlines" element={<DeadlinesPage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="practice" element={<PracticePage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="capture" element={<CapturePage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}
