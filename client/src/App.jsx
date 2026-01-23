import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/ui/toast";
import { useAuthUser } from "./hooks/useAuthUser";
import ProtectedRoute from "./components/ProtectedRoute";

import MainLayout from "./layouts/MainLayout";
import NoNavbarLayout from "./layouts/NoNavbarLayout";

import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import ProfilePage from "./pages/ProfilePage";
import BrowseGamesPage from "./pages/BrowseGamesPage";
import LobbyBrowserPage from "./pages/LobbyBrowserPage";
import LobbyPage from "./pages/LobbyPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HostNewLobby from "./pages/HostNewLobby";

import "./App.css";

function App() {
  useAuthUser();

  return (
    <ToastProvider>
      <Router>
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
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/browse" element={<BrowseGamesPage />} />
            <Route path="/game/:gameId" element={<LobbyBrowserPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/host-new-lobby" element={<HostNewLobby />} />
          </Route>

          {/* Routes WITHOUT navbar */}
          <Route element={<NoNavbarLayout />}>
            <Route path="/lobby/:lobbyId" element={<LobbyPage />} />
          </Route>

        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
