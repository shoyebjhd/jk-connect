import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppLayout from "./components/AppLayout";
import InstallPrompt from "./components/InstallPrompt";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

const Projects = lazy(() => import("./pages/Projects"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Chat = lazy(() => import("./pages/Chat"));
const Messages = lazy(() => import("./pages/Messages"));
const Network = lazy(() => import("./pages/Network"));
const Account = lazy(() => import("./pages/Account"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const titles = {
  "/": "JKAAS — Freelancer & Client Workspace",
  "/dashboard": "Dashboard — JKAAS",
  "/projects": "Projects — JKAAS",
  "/tasks": "Tasks — JKAAS",
  "/invoices": "Invoices — JKAAS",
  "/chat": "Messages — JKAAS",
  "/chat/general": "General Chat — JKAAS",
  "/network": "Network — JKAAS",
  "/account": "My Account — JKAAS",
  "/login": "Login — JKAAS",
};

function TitleUpdater() {
  const location = useLocation();
  useEffect(() => {
    const base = location.pathname.split("?")[0];
    document.title = titles[base] || "JKAAS";
  }, [location]);
  return null;
}

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  );

  return (
    <>
      <TitleUpdater />
      <InstallPrompt />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/projects" element={<ProtectedLayout><Projects /></ProtectedLayout>} />
          <Route path="/tasks" element={<ProtectedLayout><Tasks /></ProtectedLayout>} />
          <Route path="/invoices" element={<ProtectedLayout><Invoices /></ProtectedLayout>} />
          <Route path="/chat" element={<ProtectedLayout><Messages /></ProtectedLayout>} />
          <Route path="/chat/general" element={<ProtectedLayout><Chat /></ProtectedLayout>} />
          <Route path="/chat/project/:projectId" element={<ProtectedLayout><Chat /></ProtectedLayout>} />
          <Route path="/network" element={<ProtectedLayout><Network /></ProtectedLayout>} />
          <Route path="/account" element={<ProtectedLayout><Account /></ProtectedLayout>} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
