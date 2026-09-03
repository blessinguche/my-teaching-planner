import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { HubShell } from "./components/layout/HubShell";
import { QtsShell } from "./components/layout/QtsShell";
import { SchoolShell } from "./components/layout/SchoolShell";
import { AccountPage } from "./pages/AccountPage";
import { DashboardPage } from "./pages/DashboardPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { CapturePage } from "./pages/CapturePage";
import { DeadlinesPage } from "./pages/DeadlinesPage";
import { HubHomePage } from "./pages/HubHomePage";
import { PracticePage } from "./pages/PracticePage";
import { PlannerPage } from "./pages/PlannerPage";
import { ResourcesPage } from "./pages/ResourcesPage";
import { SchoolsPage } from "./pages/SchoolsPage";
import { TodosPage } from "./pages/TodosPage";
import {
  SchoolAttendancePage,
  SchoolBehaviourPage,
  SchoolBirthdaysPage,
  SchoolCommsPage,
  SchoolContactsPage,
  SchoolGoalsPage,
  SchoolGradesPage,
  SchoolHomePage,
  SchoolHomeworkPage,
  SchoolLessonsPage,
  SchoolPdPage,
  SchoolProjectsPage,
  SchoolRosterPage,
  SchoolSuppliesPage,
  SchoolTermsPage,
  SchoolTimetablePage,
  SchoolTodosPage,
} from "./pages/SchoolPages";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="account" element={<AccountPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<HubShell />}>
              <Route index element={<HubHomePage />} />
              <Route path="cal" element={<PlannerPage />} />
              <Route path="planner" element={<Navigate to="/cal" replace />} />
              <Route path="schools" element={<SchoolsPage />} />
            </Route>

            <Route path="qts" element={<QtsShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="todos" element={<TodosPage />} />
              <Route path="deadlines" element={<DeadlinesPage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="practice" element={<PracticePage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="capture" element={<CapturePage />} />
            </Route>

            <Route path="school/:schoolId" element={<SchoolShell />}>
              <Route index element={<SchoolHomePage />} />
              <Route path="terms" element={<SchoolTermsPage />} />
              <Route path="timetable" element={<SchoolTimetablePage />} />
              <Route path="lessons" element={<SchoolLessonsPage />} />
              <Route path="roster" element={<SchoolRosterPage />} />
              <Route path="attendance" element={<SchoolAttendancePage />} />
              <Route path="grades" element={<SchoolGradesPage />} />
              <Route path="behaviour" element={<SchoolBehaviourPage />} />
              <Route path="homework" element={<SchoolHomeworkPage />} />
              <Route path="comms" element={<SchoolCommsPage />} />
              <Route path="contacts" element={<SchoolContactsPage />} />
              <Route path="todos" element={<SchoolTodosPage />} />
              <Route path="goals" element={<SchoolGoalsPage />} />
              <Route path="pd" element={<SchoolPdPage />} />
              <Route path="supplies" element={<SchoolSuppliesPage />} />
              <Route path="projects" element={<SchoolProjectsPage />} />
              <Route path="birthdays" element={<SchoolBirthdaysPage />} />
            </Route>

            {/* Legacy QTS routes → new QTS area */}
            <Route path="todos" element={<Navigate to="/qts/todos" replace />} />
            <Route path="deadlines" element={<Navigate to="/qts/deadlines" replace />} />
            <Route path="knowledge" element={<Navigate to="/qts/knowledge" replace />} />
            <Route path="practice" element={<Navigate to="/qts/practice" replace />} />
            <Route path="resources" element={<Navigate to="/qts/resources" replace />} />
            <Route path="capture" element={<Navigate to="/qts/capture" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
