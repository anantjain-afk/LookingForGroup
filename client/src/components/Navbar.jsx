import { Bell, User, LogOut } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "../store/useUserStore";
import { useToast } from "./ui/toast";
import { apiPost } from "../api/client";
import { Button } from "./ui/button";

export default function Navbar() {
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiPost("/api/auth/logout");
      clearUser();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full h-[72px] px-7 bg-gradient-to-b from-[#0e0f11] to-[#15171a] border-b border-[#1f2226] flex items-center justify-between">
      {/* LEFT */}
      <Link to="/" className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-[#3cff00] flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3cff00]" />
        </div>
        <span className="text-white text-lg font-semibold">LobbyLink</span>
      </Link>

      {/* CENTER */}
      {user && (
        <div className="flex items-center gap-10">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/browse">Browse Games</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </div>
      )}

      {/* RIGHT */}
      <div className="flex items-center gap-5">
        {user ? (
          <>
            <div className="relative cursor-pointer">
              <Bell className="w-5 h-5 text-gray-300" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#3cff00]" />
            </div>

            <Link to="/host-new-lobby" className="bg-[#3cff00] hover:bg-[#2bd400] text-black font-semibold px-4 py-2 rounded-lg transition shadow-[0_0_15px_rgba(60,255,0,0.3)]">
              Create Lobby
            </Link>

            <div className="flex items-center gap-3">
              <div 
                onClick={() => navigate("/profile")}
                className="w-10 h-10 rounded-full border-2 border-[#3cff00] flex items-center justify-center cursor-pointer hover:bg-[#3cff00]/10 transition"
              >
                <User className="w-5 h-5 text-gray-300" />
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-500 transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/login")}
              variant="ghost"
              className="text-[#3cff00] hover:text-[#3cff00] hover:bg-[#3cff00]/10 font-medium"
            >
              Login
            </Button>
            <Button
              onClick={() => navigate("/register")}
              className="bg-[#3cff00] hover:bg-[#2bd400] text-black font-semibold shadow-[0_0_15px_rgba(60,255,0,0.3)]"
            >
              Sign Up
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ children, to }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`relative cursor-pointer text-sm font-medium transition ${
        isActive ? "text-[#3cff00]" : "text-gray-400 hover:text-white"
      }`}
    >
      {children}
      {isActive && (
        <span className="absolute left-0 -bottom-1 w-full h-[2px] bg-[#3cff00] rounded-full" />
      )}
    </Link>
  );
}
