import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { AccountShell } from "./components/layout/AccountShell";
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
  SchoolCalendarSpreadPage,
  SchoolClassHubPage,
  SchoolClassroomPracticePage,
  SchoolFocusPage,
  SchoolGroupsPage,
  SchoolHomePage,
  SchoolInfoPage,
  SchoolLoginsPage,
  SchoolMentorPage,
  SchoolNotesHubPage,
  SchoolObservedPage,
  SchoolObservingPage,
  SchoolObservationOfOthersPage,
  SchoolOverviewPage,
  SchoolPlanningPage,
  SchoolLessonPlanPage,
  SchoolProudPage,
  SchoolTprPage,
  SchoolRecordsTrackersPage,
  SchoolResourcesFindsPage,
  SchoolRolesPage,
  SchoolStudentsNotesPage,
  SchoolTargetsPage,
  SchoolTimetableSpreadPage,
  SchoolWeeklyPage,
} from "./pages/SchoolPlannerPages";

function SchoolRedirect({ to }: { to: string }) {
  const { schoolId } = useParams();
  return <Navigate to={`/school/${schoolId}/${to}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AccountShell />}>
            <Route path="account" element={<AccountPage />} />
          </Route>

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
              <Route path="focus" element={<SchoolFocusPage />} />
              <Route path="calendar" element={<SchoolCalendarSpreadPage />} />
              <Route path="planning" element={<SchoolPlanningPage />} />
              <Route path="lesson-plan" element={<SchoolLessonPlanPage />} />
              <Route path="lessons" element={<SchoolRedirect to="lesson-plan" />} />
              <Route path="timetable" element={<SchoolTimetableSpreadPage />} />
              <Route path="training" element={<SchoolTargetsPage />} />
              <Route path="targets" element={<SchoolRedirect to="training" />} />
              <Route path="notes" element={<SchoolNotesHubPage />} />
              <Route path="tpr" element={<SchoolTprPage />} />
              <Route
                path="observation-of-others"
                element={<SchoolObservationOfOthersPage />}
              />
              <Route path="mentor" element={<SchoolMentorPage />} />
              <Route path="observed" element={<SchoolObservedPage />} />
              <Route path="observing" element={<SchoolObservingPage />} />
              <Route
                path="classroom-practice"
                element={<SchoolClassroomPracticePage />}
              />
              <Route path="class" element={<SchoolClassHubPage />} />
              <Route path="students" element={<SchoolStudentsNotesPage />} />
              <Route path="groups" element={<SchoolGroupsPage />} />
              <Route path="seating" element={<SchoolRedirect to="groups" />} />
              <Route path="records" element={<SchoolRecordsTrackersPage />} />
              <Route path="overview" element={<SchoolOverviewPage />} />

              {/* Focus section legacy paths */}
              <Route path="info" element={<SchoolInfoPage />} />
              <Route path="logins" element={<SchoolLoginsPage />} />
              <Route path="roles" element={<SchoolRolesPage />} />
              <Route path="resources" element={<SchoolResourcesFindsPage />} />
              <Route path="proud" element={<SchoolProudPage />} />

              {/* Planning section legacy paths */}
              <Route path="weekly" element={<SchoolWeeklyPage />} />

              {/* Other legacy school paths */}
              <Route path="roster" element={<SchoolRedirect to="students" />} />
              <Route path="attendance" element={<SchoolRedirect to="records#attendance" />} />
              <Route path="behaviour" element={<SchoolRedirect to="records#behaviour" />} />
              <Route path="grades" element={<SchoolRedirect to="records#grades" />} />
              <Route path="homework" element={<SchoolRedirect to="records#homework" />} />
              <Route path="terms" element={<SchoolRedirect to="calendar" />} />
              <Route path="todos" element={<SchoolRedirect to="planning" />} />
              <Route path="goals" element={<SchoolRedirect to="training" />} />
              <Route path="comms" element={<SchoolRedirect to="focus" />} />
              <Route path="contacts" element={<SchoolRedirect to="focus" />} />
              <Route path="pd" element={<SchoolRedirect to="planning" />} />
              <Route path="supplies" element={<SchoolRedirect to="planning" />} />
              <Route path="projects" element={<SchoolRedirect to="overview" />} />
              <Route path="birthdays" element={<SchoolRedirect to="students" />} />
            </Route>

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
