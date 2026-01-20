import { Bell, User } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="w-full h-[72px] px-7 bg-gradient-to-b from-[#0e0f11] to-[#15171a] border-b border-[#1f2226] flex items-center justify-between">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-[#3cff00] flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3cff00]" />
        </div>
        <span className="text-white text-lg font-semibold">LobbyLink</span>
      </div>

      {/* CENTER */}
      <div className="flex items-center gap-10">
        <NavLink active>Browse Lobbies</NavLink>
        <NavLink>Find Teammates</NavLink>
        <NavLink>Leaderboard</NavLink>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-5">
        <div className="relative cursor-pointer">
          <Bell className="w-5 h-5 text-gray-300" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#3cff00]" />
        </div>

        <button className="bg-[#3cff00] hover:bg-[#2bd400] text-black font-semibold px-4 py-2 rounded-lg transition">
          Create Lobby
        </button>

        <div className="w-10 h-10 rounded-full border-2 border-[#3cff00] flex items-center justify-center cursor-pointer">
          <User className="w-5 h-5 text-gray-300" />
        </div>
      </div>
    </nav>
  );
}

function NavLink({ children, active }) {
  return (
    <span
      className={`relative cursor-pointer text-sm font-medium transition ${
        active ? "text-[#3cff00]" : "text-gray-400 hover:text-white"
      }`}
    >
      {children}
      {active && (
        <span className="absolute left-0 -bottom-1 w-full h-[2px] bg-[#3cff00] rounded-full" />
      )}
    </span>
  );
}
