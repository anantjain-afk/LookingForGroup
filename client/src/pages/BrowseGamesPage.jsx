import { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { Search } from 'lucide-react';
import { apiGet } from "../api/client";
import { useNavigate } from "react-router-dom";

// Helper to fetch games
const fetchGames = async (params) => {
    const searchParams = new URLSearchParams(params);
    const res = await apiGet(`/api/games?${searchParams.toString()}`);
    return res;
};

// Reusable Game Card Component
const GameCard = ({ game, onClick }) => (
    <div onClick={onClick} className="group relative bg-[#151515] rounded-2xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-300 border border-transparent hover:border-[#5865F2] hover:shadow-[0_0_15px_rgba(60,255,0,0.2)] aspect-[2/3]">
        <img 
            src={game.cover || "https://placehold.co/300x400/1e293b/475569?text=No+Cover"} 
            alt={game.name} 
            className="w-full h-full object-cover group-hover:opacity-40 transition-opacity"
            loading="lazy"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-4">
             <h3 className="text-white font-bold text-center mb-4">{game.name}</h3>
             <button className="bg-emerald-500 text-black font-bold py-2 px-6 rounded-full hover:bg-emerald-600 transition transform hover:scale-105">
                Find Lobbies
             </button>
        </div>
        
        {/* Title overlay at bottom if not hovering? No, design says clean card. */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-100 group-hover:opacity-0 transition-opacity">
            <h3 className="text-white font-bold truncate text-sm">{game.name}</h3>
        </div>
    </div>
);

// Reusable Section Component
const GameSection = ({ title, games, isLoading, onGameClick }) => {
    if (isLoading) {
        return (
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white pl-2 border-l-4 border-[#5865F2]">{title}</h2>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="min-w-[160px] md:min-w-[200px] aspect-[2/3] bg-slate-800 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!games || games.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                 <h2 className="text-2xl font-bold text-white">{title}</h2>
                 <div className="h-[2px] w-12 bg-emerald-500 rounded-full"></div>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent px-1">
                {games.map(game => (
                    <div key={game.id} className="min-w-[160px] md:min-w-[200px] w-[160px] md:w-[200px]">
                        <GameCard game={game} onClick={() => onGameClick(game.id)} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function BrowseGamesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();

    const handleGameClick = (gameId) => {
        navigate(`/game/${gameId}`);
    };

    // Condition A: Discovery View (Parallel queries)
    const discoveryQueries = useQueries({
        queries: [
            { queryKey: ['games', 'trending'], queryFn: () => fetchGames({ category: 'trending' }) }, // Default/Popular
            { queryKey: ['games', 'shooters'], queryFn: () => fetchGames({ category: 'shooters' }) },
            { queryKey: ['games', 'rpg'], queryFn: () => fetchGames({ category: 'rpg' }) },
            { queryKey: ['games', 'coop'], queryFn: () => fetchGames({ category: 'coop' }) }
        ]
    });

    const [trending, shooters, rpg, coop] = discoveryQueries;

    // Condition B: Search View
    const { data: searchResults, isLoading: isSearchLoading } = useQuery({
        queryKey: ['games', 'search', searchQuery],
        queryFn: () => fetchGames({ query: searchQuery }),
        enabled: searchQuery.length > 0,
    });

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">


            <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
                
                {/* 1. Header & Search */}
                <div className="flex flex-col items-center space-y-6">
                    <h1 className="text-4xl md:text-5xl font-bold text-center">
                        Browse <span className="text-[#5865F2]">Games</span>
                    </h1>
                    
                    <div className="relative w-full max-w-2xl group">
                         <div className="absolute inset-0 bg-[#5865F2]/20 rounded-full blur-xl group-hover:bg-[#5865F2]/30 transition duration-500"></div>
                         <div className="relative flex items-center bg-[#151515] border border-gray-800 rounded-full p-2 focus-within:border-[#5865F2] transition-all">
                            <Search className="ml-4 text-gray-400 group-focus-within:text-[#5865F2] transition" size={24} />
                            <input 
                                type="text" 
                                placeholder="Search specifically..." 
                                className="w-full bg-transparent text-white px-4 py-3 focus:outline-none placeholder-gray-500 text-lg"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                         </div>
                    </div>
                </div>

                {/* 2. Content Area */}
                <div className="space-y-12">
                    {searchQuery.length > 0 ? (
                        // Search Results Grid
                        <div>
                             <h2 className="text-xl font-bold text-white mb-6">Search Results for "{searchQuery}"</h2>
                             {isSearchLoading ? (
                                <p className="text-gray-500">Searching...</p>
                             ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                     {Array.isArray(searchResults) && searchResults.map(game => (
                                         <GameCard key={game.id} game={game} onClick={() => handleGameClick(game.id)} />
                                     ))}
                                     {Array.isArray(searchResults) && searchResults.length === 0 && (
                                         <p className="text-gray-500 col-span-full text-center py-10">No games found.</p>
                                     )}
                                </div>
                             )}
                        </div>
                    ) : (
                        // Discovery Sections
                        <div className="space-y-16 animate-fade-in">
                            <GameSection title="Trending Now" games={trending.data} isLoading={trending.isLoading} onGameClick={handleGameClick} />
                            <GameSection title="Competitive Shooters" games={shooters.data} isLoading={shooters.isLoading} onGameClick={handleGameClick} />
                            <GameSection title="MMO & Raids" games={rpg.data} isLoading={rpg.isLoading} onGameClick={handleGameClick} />
                            <GameSection title="Chill & Co-op" games={coop.data} isLoading={coop.isLoading} onGameClick={handleGameClick} />
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
