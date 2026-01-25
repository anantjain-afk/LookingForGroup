import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Mic, Headphones, Settings, Send, User, ShieldAlert, LogOut, Copy, RefreshCw, XCircle } from "lucide-react";

import { useUserStore } from "../store/useUserStore";
import { useToast } from "../components/ui/toast";
import { apiPatch } from "../api/client"; 
import { cn } from "../lib/utils";
import ConfirmationModal from "../components/ConfirmationModal";

export default function LobbyPage() {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUserStore();
  
  // State
  const [socket, setSocket] = useState(null);
  const [lobby, setLobby] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // UI State
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  
  // Inputs
  const [messageInput, setMessageInput] = useState("");
  const [credentials, setCredentials] = useState("");
  
  // Refs
  const messagesEndRef = useRef(null);

  // Auto-scroll chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // Socket Connection Effect
  useEffect(() => {
    if (!user || !lobbyId) return;

    // 1. Connect
    const newSocket = io("http://localhost:3000", {
        withCredentials: true,
        reconnectionAttempts: 5
    });

    setSocket(newSocket);

    // 2. Setup Listeners
    newSocket.on("connect", () => {
        setIsConnected(true);
        // Join immediately upon connection
        newSocket.emit("join_lobby", { lobbyId, userId: user.id });
    });

    newSocket.on("lobby_updated", (updatedLobby) => {
        setLobby(updatedLobby);
        // Pre-fill credentials if we are host or they are public? (Mock logic for now)
        // setCredentials(updatedLobby?.credentials || "");
    });

    newSocket.on("new_message", (msg) => {
        setMessages((prev) => [...prev, msg]);
    });

    newSocket.on("player_kicked", ({ userId }) => {
        if (userId === user.id) {
            toast({ title: "Kicked", description: "You have been kicked from the lobby.", variant: "destructive" });
            navigate("/browse");
        }
    });

    newSocket.on("LOBBY_DISBANDED", () => {
        toast({ title: "Lobby Closed", description: "The host has closed the lobby.", variant: "default" });
        navigate("/browse");
    });

    newSocket.on("error", (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        // If "Lobby not found" or "Lobby is full" on join, maybe redirect?
        if (err.message === "Lobby not found" || err.message === "Lobby is full") {
             setTimeout(() => navigate("/browse"), 2000);
        }
    });

    // 3. Cleanup
    return () => {
        newSocket.off("connect");
        newSocket.off("lobby_updated");
        newSocket.off("new_message");
        newSocket.off("player_kicked");
        newSocket.off("LOBBY_DISBANDED");
        newSocket.off("error");
        newSocket.disconnect();
    };
  }, [lobbyId, user, navigate, toast]);


  // Handlers
  const handleSendMessage = () => {
      if (!messageInput.trim() || !socket) return;
      
      socket.emit("send_message", { 
          message: messageInput, 
          user: { 
              id: user.id, 
              username: user.username, 
              avatar: user.avatar 
          } 
      });
      setMessageInput("");
  };

  const handleToggleReady = () => {
      if (!socket) return;
      socket.emit("toggle_ready");
  };

  const handleLeaveLobby = () => {
      if (socket) {
          socket.emit("leave_lobby");
          socket.disconnect();
      }
      navigate("/");
  };
  
  const handleKickPlayer = (targetUserId) => {
      if (!socket) return;
      socket.emit("kick_player", { targetUserId });
  };

  const handleCloseLobby = async () => {
      try {
          await apiPatch(`/api/lobbies/${lobbyId}/close`);
          // Note: Navigation handled by socket event LOBBY_DISBANDED
      } catch (err) {
          console.error(err);
          toast({ title: "Error", description: "Failed to close lobby", variant: "destructive" });
      }
  };


  // --- Render Helpers ---

  if (!user || !lobbyId) {
       return <div className="h-screen bg-[#313338] text-white flex items-center justify-center">Loading Lobby...</div>;
  }

  if (!isConnected && !lobby) {
       return <div className="h-screen bg-[#313338] text-white flex items-center justify-center">Connecting to server...</div>;
  }

  // If connected strictly but no lobby data yet? (Usually comes fast)
  if (!lobby) {
       return <div className="h-screen bg-[#313338] text-white flex items-center justify-center">Fetching lobby details...</div>;
  }

  const isHost = lobby.hostId === user.id;
  const activePlayers = lobby.participants || [];
  const emptySlots = Math.max(0, (lobby.maxPlayers || 5) - activePlayers.length);
  const myParticipantRes = activePlayers.find(p => p.userId === user.id);
  const amIReady = myParticipantRes?.isReady || false;

  return (
    <div className="h-screen flex flex-col bg-[#313338] text-gray-100 font-sans overflow-hidden">
      
      {/* Confirmation Modal */}
      <ConfirmationModal 
          isOpen={isCloseModalOpen}
          onClose={() => setIsCloseModalOpen(false)}
          onConfirm={handleCloseLobby}
          title="Close Lobby?"
          description="Are you sure you want to close this lobby? All participants will be removed and the lobby will be deleted."
          confirmText="Yes, Close Lobby"
          cancelText="Cancel"
      />

      {/* MAIN CONTENT AREA (Chat + Sidebar) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT: CHAT AREA */}
        <div className="flex-1 flex flex-col relative min-w-0">
            
            {/* Header */}
            <div className="h-12 border-b border-[#1b1c1e] flex items-center px-4 justify-between bg-[#313338] shadow-sm z-10">
                <div className="flex items-center gap-3 overflow-hidden">
                    <h2 className="font-bold text-white text-lg truncate flex items-center gap-2">
                         {lobby.title}
                    </h2>
                    <div className="hidden md:flex gap-2">
                         {lobby.tags?.map(tag => (
                             <span key={tag.id} className="bg-[#4566dd] text-xs font-medium px-2 py-0.5 rounded text-gray-300">
                                 {tag.name}
                             </span>
                         ))}
                    </div>
                </div>
                <div className="text-emerald-500 text-xs font-mono">
                    {lobby.game?.name}
                </div>
            </div>

            {/* System Alert */}
            <div className="bg-red-500/10 border-l-4 border-red-500 p-3 mx-4 mt-4 rounded-r-md flex items-center gap-3 shrink-0">
                 <ShieldAlert className="text-red-500" size={20} />
                 <span className="text-red-200 text-sm font-medium">🛑 Vibe Check: No toxic behavior. We are here to win, not to whine.</span>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#1a1b1e] scrollbar-track-transparent">
                 {/* Welcome Message (Static) */}
                 <div className="flex gap-3 group opacity-70">
                      <div className="w-10 flex justify-center"><ShieldAlert size={16} /></div> 
                      <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                              <span className="font-medium text-red-400">System</span>
                              <span className="text-[10px] text-gray-400">Just now</span>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed">Welcome to the lobby! Waiting for players...</p>
                      </div>
                 </div>

                 {messages.map((msg, idx) => (
                     <div key={idx} className="flex gap-3 group animate-in fade-in duration-300">
                          <div className="w-10 h-10 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center overflow-hidden">
                               {msg.user?.avatar ? <img src={msg.user.avatar} className="w-full h-full" /> : <User size={20} />}
                          </div>
                          
                          <div className="flex-1">
                              <div className="flex items-baseline gap-2">
                                  <span className="font-medium hover:underline cursor-pointer text-white">
                                      {msg.user?.username || "Unknown"}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                                  </span>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed">{msg.text}</p>
                          </div>
                     </div>
                 ))}
                 <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#313338] shrink-0">
                <div className="relative bg-[#383a40] rounded-lg">
                    <input 
                        type="text" 
                        placeholder={`Message #${lobby.title.toLowerCase().replace(/\s+/g, '-')}`} 
                        className="w-full bg-transparent text-white p-3 pr-10 focus:outline-none placeholder-gray-500 text-sm"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button 
                        onClick={handleSendMessage}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>

        {/* RIGHT: SIDEBAR (SQUAD LIST) */}
        <div className="w-[300px] md:w-[350px] bg-[#2b2d31] border-l border-[#1f2023] flex flex-col shrink-0 transition-all">
             <div className="h-12 border-b border-[#1f2023] flex items-center px-4 font-bold text-gray-400 text-xs uppercase tracking-wide">
                 Squad ({activePlayers.length}/{lobby.maxPlayers} Players)
             </div>

             <div className="p-3 space-y-2 overflow-y-auto flex-1">
                 {/* Player Cards */}
                 {activePlayers.map(p => {
                     const isP_Host = lobby.hostId === p.userId;
                     return (
                         <div key={p.userId} className="flex items-center gap-3 p-2 rounded hover:bg-[#35373c] group cursor-pointer transition-colors relative">
                              {/* Avatar */}
                              <div className="relative">
                                  <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-white overflow-hidden">
                                      {p.user?.avatar ? <img src={p.user.avatar} className="w-full h-full object-cover" /> : <User size={16} />}
                                  </div>
                                  {/* Status Dot (Online/Ready) */}
                                  <div className={cn(
                                      "absolute bottom-0 right-0 w-3 h-3 border-2 border-[#2b2d31] rounded-full",
                                      p.isReady ? "bg-green-500" : "bg-gray-400"
                                  )}></div>
                              </div>
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-white text-sm truncate flex items-center gap-1">
                                      {p.user?.username}
                                      {isP_Host && <span className="text-[#e2b714]" title="Host"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg></span>}
                                  </h4>
                                  <p className="text-xs text-gray-400">{isP_Host ? "Lobby Host" : "Member"}</p>
                              </div>

                              {/* Ready Badge or Kick Button */}
                              <div className="flex items-center gap-2">
                                  <div className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all",
                                      p.isReady 
                                        ? "bg-green-500/10 text-green-400 border-green-500/30" 
                                        : "bg-gray-700/50 text-gray-500 border-gray-600"
                                  )}>
                                      {p.isReady ? "Ready" : "Not Ready"}
                                  </div>
                                  
                                  {/* Host Kick Button (only host sees, cant kick self) */}
                                  {isHost && p.userId !== user.id && (
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleKickPlayer(p.userId); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/20 rounded transition-opacity"
                                        title="Kick Player"
                                     >
                                        <LogOut size={12} />
                                     </button>
                                  )}
                              </div>
                         </div>
                     );
                 })}

                 {/* Empty Slots */}
                 {[...Array(emptySlots)].map((_, i) => (
                     <div key={i} className="flex items-center justify-center border-2 border-dashed border-[#3f4147] rounded-lg p-4 text-center group hover:border-[#7289da] hover:bg-[#7289da]/5 transition-all cursor-pointer">
                         <div className="space-y-1">
                             <p className="text-gray-500 text-xs font-medium group-hover:text-[#7289da]">Waiting for Player...</p>
                             <button className="text-xs bg-[#5865F2] hover:bg-[#4752c4] text-white px-3 py-1 rounded transition-colors">
                                 Invite Friend
                             </button>
                         </div>
                     </div>
                 ))}
             </div>
        </div>

      </div>

      {/* BOTTOM CONTROL BAR */}
      <div className="h-[80px] bg-[#232428] flex items-center justify-between px-4 md:px-6 shrink-0">
          
          {/* Left: User/Voice Controls */}
          <div className="flex items-center gap-4 bg-[#1e1f22] p-2 rounded-md">
               <div className="flex items-center gap-2 pr-4 border-r border-[#3f4147]">
                   <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center overflow-hidden">
                       {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <User size={16} />}
                   </div>
                   <div className="text-xs">
                       <div className="font-bold text-white">You</div>
                       <div className="text-gray-400">#{user.username?.slice(-4) || "0000"}</div>
                   </div>
               </div>
               
               <div className="flex items-center gap-2">
                   <button className="p-2 hover:bg-[#3f4147] rounded text-gray-300 hover:text-white transition-colors relative">
                       <Mic size={20} />
                   </button>
                   <button className="p-2 hover:bg-[#3f4147] rounded text-gray-300 hover:text-white transition-colors">
                       <Headphones size={20} />
                   </button>
                   <button className="p-2 hover:bg-[#3f4147] rounded text-gray-300 hover:text-white transition-colors">
                       <Settings size={20} />
                   </button>
               </div>
          </div>

          {/* Center: Game Credentials */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
               <div className="flex items-center w-full bg-[#1e1f22] rounded overflow-hidden border border-[#1e1f22] focus-within:border-[#7289da] transition-colors">
                   <div className="bg-[#2b2d31] px-3 py-2.5 text-gray-400 border-r border-[#1e1f22]">
                       <Copy size={16} />
                   </div>
                   <input 
                       type="text" 
                       placeholder="Game Lobby ID / Password" 
                       className="w-full bg-transparent text-sm text-white px-3 py-2 focus:outline-none placeholder-gray-500 font-mono"
                       value={credentials}
                       onChange={(e) => setCredentials(e.target.value)}
                   />
                   <button className="bg-[#2b2d31] hover:bg-[#35373c] px-3 py-2.5 text-gray-400 hover:text-white transition-colors">
                       <RefreshCw size={14} />
                   </button>
               </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
              <button 
                  onClick={handleToggleReady}
                  className={cn(
                      "font-bold py-2.5 px-6 rounded transition transform hover:scale-105 shadow-lg active:scale-95 text-white",
                      amIReady 
                        ? "bg-gray-500 hover:bg-gray-600" // Already ready -> Cancel?
                        : "bg-[#23a559] hover:bg-[#1a8c48]"
                  )}
              >
                  {amIReady ? "CANCEL READY" : "READY UP"}
              </button>
              
              {/* Close Lobby (Host) or Leave (Member) */}
              {isHost ? (
                  <button 
                      onClick={() => setIsCloseModalOpen(true)}
                      className="border border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white font-bold py-2.5 px-4 rounded transition flex items-center gap-2"
                  >
                      <XCircle size={18} />
                      <span className="hidden md:inline">Close Lobby</span>
                  </button>
              ) : (
                  <button 
                      onClick={handleLeaveLobby}
                      className="border border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold py-2.5 px-4 rounded transition flex items-center gap-2"
                  >
                      <LogOut size={18} />
                      <span className="hidden md:inline">Leave</span>
                  </button>
              )}
          </div>
      </div>

    </div>
  );
}
