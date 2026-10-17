import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/ui/toast";
import { useAuthUser } from "./hooks/useAuthUser";
import ProtectedRoute from "./components/ProtectedRoute";
import AppErrorBoundary from "./components/AppErrorBoundary";

import MainLayout from "./layouts/MainLayout";
import NoNavbarLayout from "./layouts/NoNavbarLayout";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const BrowseGamesPage = lazy(() => import("./pages/BrowseGamesPage"));
const LobbyBrowserPage = lazy(() => import("./pages/LobbyBrowserPage"));
const LobbyPage = lazy(() => import("./pages/LobbyPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const HostNewLobby = lazy(() => import("./pages/HostNewLobby"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
import AuthBanner from "./components/AuthBanner";

import "./App.css";

function App() {
  useAuthUser();

  return (
    <AppErrorBoundary>
      <ToastProvider>
        <AuthBanner />
        <Router>
          <Suspense
            fallback={
              <div
                role="status"
                className="min-h-screen bg-[#1e2124] text-gray-300 grid place-items-center"
              >
                Loading…
              </div>
            }
          >
            <Routes>
              {/* Routes WITH navbar */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/profile/:username" element={<ProfilePage />} />
                <Route path="/browse" element={<BrowseGamesPage />} />
                <Route path="/game/:gameId" element={<LobbyBrowserPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                  path="/host-new-lobby"
                  element={
                    <ProtectedRoute>
                      <HostNewLobby />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/forgot-password"
                  element={<AuthPage mode="forgot" />}
                />
                <Route
                  path="/reset-password"
                  element={<AuthPage mode="reset" />}
                />
                <Route
                  path="/verify-email"
                  element={<AuthPage mode="verify" />}
                />
              </Route>

              {/* Routes WITHOUT navbar */}
              <Route element={<NoNavbarLayout />}>
                <Route
                  path="/lobby/:lobbyId"
                  element={
                    <ProtectedRoute>
                      <LobbyPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    </AppErrorBoundary>
  );
}

export default App;
