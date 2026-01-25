import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Trophy, Clock, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiGet } from "../api/client";
import { cn } from "../lib/utils";

// API Fetchers
const fetchGameDetails = async (gameId) => {
  return await apiGet(`/api/games/${gameId}`);
};

const fetchGameLobbies = async (gameId) => {
  return await apiGet(`/api/games/${gameId}/lobbies`);
};

const fetchTags = async () => {
  return await apiGet("/api/tags");
};

export default function LobbyBrowserPage() {
  const { gameId } = useParams();

  // Queries
  const { data: game, isLoading: loadingGame } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => fetchGameDetails(gameId),
  });

  const { data: lobbies, isLoading: loadingLobbies } = useQuery({
    queryKey: ["lobbies", gameId],
    queryFn: () => fetchGameLobbies(gameId),
  });

  const { data: tags, isLoading: isLoadingTags } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  // Derived state
  const activeLobbyCount = lobbies?.length || 0;

  if (loadingGame) {
    return <div className="min-h-screen bg-[#1e2124] flex items-center justify-center text-white">Loading...</div>;
  }

  if (!game) {
    return <div className="min-h-screen bg-[#1e2124] flex items-center justify-center text-white">Game not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#1e2124] font-sans selection:bg-[#7289da] selection:text-white pb-20">
      
      {/* 1. HERO HEADER */}
      <div className="relative h-80 w-full overflow-hidden group">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url(${game.cover || '/placeholder-game.jpg'})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e2124] via-[#1e2124]/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-8 pb-10 max-w-7xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-widest uppercase drop-shadow-2xl">
            {game.name}
          </h1>
          <p className="text-gray-3000 font-medium text-lg mt-2 text-emerald-500 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            {activeLobbyCount} Active Lobbies
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10 space-y-6">
        
        {/* 2. FILTER CONTAINER */}
        <div className="bg-[#282b30]/90 backdrop-blur-md border border-[#7289da]/30 rounded-xl p-6 shadow-2xl">
           <div className="flex flex-col gap-4">
               {/* Search / Header Row */}
               <div className="flex items-center justify-between border-b border-gray-700 pb-4 mb-2">
                   <h3 className="text-[#dbdee1] font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                       <Search size={14} /> Find a Lobby
                   </h3>
                   <span className="text-gray-500 text-xs">Filtering coming soon</span>
               </div>

               {/* Tags Row */}
               <div className="space-y-6 pt-2">
                   {isLoadingTags ? (
                       <div className="text-gray-500 text-xs">Loading tags...</div>
                   ) : tags && !Array.isArray(tags) ? (
                       Object.entries(tags).map(([category, categoryTags]) => (
                           <div key={category} className="space-y-2">
                               <h4 className="text-[#96989d] text-[10px] font-bold uppercase tracking-widest pl-1">
                                   {category}
                               </h4>
                               <div className="flex flex-wrap gap-2">
                                   {categoryTags.map((tag) => (
                                       <FilterPill key={tag.id} label={tag.name} />
                                   ))}
                               </div>
                           </div>
                       ))
                   ) : (
                       /* Fallback if tags is array or null */
                       <div className="flex flex-wrap gap-2">
                           {(Array.isArray(tags) ? tags : []).map((tag) => (
                               <FilterPill key={tag.id} label={tag.name} />
                           ))}
                       </div>
                   )}
               </div>
           </div>
        </div>

        {/* 3. LOBBY LIST */}
        <div className="space-y-4">
             {loadingLobbies ? (
                 <div className="text-gray-400 text-center py-10">Loading active lobbies...</div>
             ) : activeLobbyCount === 0 ? (
                 <div className="flex flex-col items-center justify-center py-20 text-center bg-[#282b30] rounded-xl border border-dashed border-gray-700">
                     <Users size={48} className="text-gray-600 mb-4" />
                     <h3 className="text-xl font-bold text-gray-300">No Lobbies Found</h3>
                     <p className="text-gray-500 mt-2">Be the first to host a lobby for {game.name}!</p>
                 </div>
             ) : (
                 lobbies.map((lobby) => (
                     <LobbyCard key={lobby.id} lobby={lobby} />
                 ))
             )}
        </div>

      </div>
    </div>
  );
}

// Sub-components

function FilterPill({ label, active = false }) {
    return (
        <button 
           className={cn(
               "px-3 py-1.5 rounded text-xs font-semibold transition-all shadow-sm border",
               active 
                ? "bg-[#7289da] text-white border-[#7289da]" 
                : "bg-[#36393f] text-gray-400 border-transparent hover:bg-[#424549] hover:text-gray-200"
           )}
        >
            {label}
        </button>
    )
}

function LobbyCard({ lobby }) {
    const navigate = useNavigate();
    const isFull = lobby.participants.length >= lobby.maxPlayers;
    
    return (
        <div className="group bg-[#282b30] hover:bg-[#32353b] border border-[#2f3136] hover:border-[#7289da] rounded-lg p-5 transition-all duration-200 shadow-lg relative overflow-hidden">
             <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
                 
                 {/* Left Content */}
                 <div className="space-y-2 flex-1">
                     <div className="flex items-center justify-between md:justify-start md:gap-4">
                         <h3 className="text-lg font-bold text-white group-hover:text-[#7289da] transition-colors truncate">
                            {lobby.title}
                         </h3>
                         <span className="text-xs font-medium text-gray-500 bg-[#202225] px-2 py-0.5 rounded">
                             Hosted by {lobby.host?.username || "Unknown"}
                         </span>
                     </div>
                     
                     <p className="text-gray-400 text-sm line-clamp-1">
                         {lobby.description || "No description provided."}
                     </p>

                     {/* Metadata Row */}
                     <div className="flex items-center gap-4 text-xs font-medium text-gray-400 pt-2">
                         <div className={cn("flex items-center gap-1.5", isFull ? "text-red-400" : "text-emerald-600")}>
                             <Users size={14} />
                             <span>{lobby.participants.length}/{lobby.maxPlayers} Players</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                             <Trophy size={14} className="text-yellow-500" />
                             <span>{ /* Default logic if tag doesn't explicitly have category */ }
                                {lobby.tags.find(t => t.name.includes("Rank") || t.name.includes("Gold") || t.name.includes("Plat"))?.name || "Any Rank"}
                             </span>
                         </div>
                         <div className="flex items-center gap-1.5">
                             <Clock size={14} />
                             <span>{formatDistanceToNow(new Date(lobby.createdAt), { addSuffix: true })}</span>
                         </div>
                     </div>

                     {/* Tags Row */}
                     <div className="flex flex-wrap gap-2 pt-1">
                         {lobby.tags.map((tag) => (
                             <span key={tag.id} className="text-[10px] uppercase font-bold text-[#eaecef] bg-[#3a6ab1] border border-gray-700 px-2 py-0.5 rounded-sm">
                                 {tag.name}
                             </span>
                         ))}
                     </div>
                 </div>

                 {/* Right Action */}
                 <div className="flex items-center">
                     <button 
                        onClick={() => !isFull && navigate(`/lobby/${lobby.id}`)}
                        disabled={isFull}
                        className={cn(
                         "w-full md:w-auto px-6 py-2.5 rounded-md font-bold text-sm transition-all shadow-md",
                         isFull 
                          ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                          : "bg-[#5865F2] hover:bg-[#4752c4] text-white"
                     )}>
                         {isFull ? "Full" : "Join Lobby"}
                     </button>
                 </div>
             </div>
        </div>
    )
}
