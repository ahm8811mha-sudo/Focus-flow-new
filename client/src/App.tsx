import "./pro-consistency.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import TasksPage from "./pages/TasksPage";
import CalendarPage from "./pages/CalendarPage";
import KanbanPage from "./pages/KanbanPage";
import NotesPage from "./pages/NotesPage";
import ProjectsPage from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import StatisticsPage from "./pages/StatisticsPage";
import SettingsPage from "./pages/SettingsPage";
import SearchPage from "./pages/SearchPage";
import { Home3D } from "./pages/Home3D";
import LocalFocusFlow from "./pages/LocalFocusFlow";
import TaskCenterPage from "./pages/TaskCenterPage";
import PersonalAgentsPage from "./pages/PersonalAgentsPage";
import ExecutionAgentsPage from "./pages/ExecutionAgentsPage";
import SystemHubPage from "./pages/SystemHubPage";
import FocusFlowOS from "./pages/FocusFlowOS";
import DirectoryPage from "./pages/DirectoryPage";
import ExecutionLogPage from "./pages/ExecutionLogPage";

const ClassicTasksRoute = () => (
  <DashboardLayout>
    <TasksPage />
  </DashboardLayout>
);

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={FocusFlowOS} />
      <Route path={"/focus"} component={FocusFlowOS} />
      <Route path={"/tasks"} component={TaskCenterPage} />
      <Route path={"/local"} component={TaskCenterPage} />
      <Route path={"/legacy-local"} component={LocalFocusFlow} />
      <Route path={"/directory"} component={DirectoryPage} />
      <Route path={"/execution"} component={ExecutionLogPage} />
      <Route path={"/classic-tasks"} component={ClassicTasksRoute} />
      <Route path={"/agents"} component={ExecutionAgentsPage} />
      <Route path={"/personal-agents"} component={PersonalAgentsPage} />
      <Route path={"/system"} component={SystemHubPage} />
      <Route path={"/hub"} component={SystemHubPage} />
      <Route path={"/home-3d"} component={Home3D} />
      <Route path={"/classic"} component={Home} />
      <Route path={"/calendar"} component={CalendarPage} />
      <Route path={"/kanban"}>{() => (<DashboardLayout><KanbanPage /></DashboardLayout>)}</Route>
      <Route path={"/notes"}>{() => (<DashboardLayout><NotesPage /></DashboardLayout>)}</Route>
      <Route path={"/projects"}>{() => (<DashboardLayout><ProjectsPage /></DashboardLayout>)}</Route>
      <Route path={"/projects/:projectId"}>{() => (<DashboardLayout><ProjectDetailPage /></DashboardLayout>)}</Route>
      <Route path={"/statistics"}>{() => (<DashboardLayout><StatisticsPage /></DashboardLayout>)}</Route>
      <Route path={"/settings"}>{() => (<DashboardLayout><SettingsPage /></DashboardLayout>)}</Route>
      <Route path={"/search"}>{() => (<DashboardLayout><SearchPage /></DashboardLayout>)}</Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <div dir="rtl">
            <Router />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
