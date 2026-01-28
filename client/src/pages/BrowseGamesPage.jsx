import { useState, useMemo } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Search, X, LayoutGrid, List } from 'lucide-react'; // Added icons
import { apiGet } from "../api/client";
import { useNavigate } from "react-router-dom";
import SidebarFilters from '../features/games/SidebarFilters';

// Helper to fetch games
const fetchGames = async (params) => {
    const searchParams = new URLSearchParams();
    
    // Flatten params for URLSearchParams
    Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
            searchParams.append(key, value.join(','));
        } else if (value && !Array.isArray(value)) {
            searchParams.append(key, value);
        }
    });

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
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-100 group-hover:opacity-0 transition-opacity">
            <h3 className="text-white font-bold truncate text-sm">{game.name}</h3>
             {/* Optional: Add genre/rating check if data exists */}
             <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">{game.startPrice ? `$${game.startPrice}` : 'Free'}</span>
                {game.rating && <span className="text-xs text-amber-400">★ {game.rating}</span>}
             </div>
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
            
            <div className="flex gap-4 overflow-x-auto scrollbar-hide  pb-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent px-1">
                {games.map(game => (
                    <div key={game.id} className="min-w-[160px] md:min-w-[200px] w-[160px] md:w-[200px]">
                        <GameCard game={game} onClick={() => onGameClick(game.id)} />
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper to look up labels (Should ideally match SidebarFilters, or be imported from a shared constant)
const GENRES_MAP = {
    '5': 'Shooter',
    '12': 'RPG',
    '15': 'Strategy',
    '31': 'Adventure',
    '36': 'MOBA'
};

const PLATFORMS_MAP = {
    '6': 'PC',
    '167': 'PS5',
    '169': 'Xbox',
    '130': 'Switch'
};

export default function BrowseGamesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({ genres: [], platforms: [] });
    const [sortBy, setSortBy] = useState('popularity');
    const navigate = useNavigate();

    // Check if any filters are active
    const hasActiveFilters = useMemo(() => {
        return filters.genres.length > 0 || filters.platforms.length > 0;
    }, [filters]);

    const handleGameClick = (gameId) => {
        navigate(`/game/${gameId}`);
    };

    const handleFilterChange = (category, updatedValues) => {
        setFilters(prev => ({
            ...prev,
            [category]: updatedValues
        }));
    };

    const removeFilter = (category, value) => {
        setFilters(prev => ({
            ...prev,
            [category]: prev[category].filter(item => item !== value)
        }));
    };

    const handleReset = () => {
        setFilters({ genres: [], platforms: [] });
        setSearchQuery("");
        setSortBy('popularity');
    };

    // Condition A: Discovery View (Only if NO search and NO filters)
    const showDiscovery = !hasActiveFilters && searchQuery.length === 0;

    const discoveryQueries = useQueries({
        queries: showDiscovery ? [
            { queryKey: ['games', 'trending'], queryFn: () => fetchGames({ category: 'trending' }) },
            { queryKey: ['games', 'shooters'], queryFn: () => fetchGames({ category: 'shooters' }) },
            { queryKey: ['games', 'rpg'], queryFn: () => fetchGames({ category: 'rpg' }) },
            { queryKey: ['games', 'coop'], queryFn: () => fetchGames({ category: 'coop' }) }
        ] : []
    });

    const [trending, shooters, rpg, coop] = discoveryQueries;

    // Condition B: Filtered/Search View
    const { data: searchResults, isLoading: isSearchLoading } = useQuery({
        queryKey: ['games', 'search', searchQuery, filters, sortBy],
        queryFn: () => fetchGames({ 
            query: searchQuery, 
            genres: filters.genres,
            platforms: filters.platforms,
            sortBy 
        }),
        enabled: !showDiscovery,
    });

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                
                {/* 1. Header & Search (Stays Full Width) */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Browse Games</h1>
                        <p className="text-gray-400 text-sm mt-1">
                            {showDiscovery 
                                ? "Discover your next adventure" 
                                : `Showing ${Array.isArray(searchResults) ? searchResults.length : 0} results`
                            }
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                         <div className="flex items-center gap-2 bg-[#151515] px-3 py-1.5 rounded-lg border border-gray-800 text-sm text-gray-400">
                             <span>Grid View</span>
                             <LayoutGrid size={16} className="text-cyan-500" />
                         </div>
                    </div>
                </div>

                <div className="relative w-full group">
                     <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition duration-500"></div>
                     <div className="relative flex items-center bg-[#151515] border border-gray-800 rounded-full p-2 focus-within:border-emerald-500 transition-all">
                        <Search className="ml-4 text-gray-400 group-focus-within:text-emerald-500 transition" size={20} />
                        <input 
                            type="text" 
                            placeholder="Search games..." 
                            className="w-full bg-transparent text-white px-4 py-2 focus:outline-none placeholder-gray-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                     </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* LEFT: Game Grid Area */}
                    <div className="flex-1 w-full min-w-0">
                        
                        {/* Active Filter Tags */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-left-2">
                                {filters.genres.map(genreId => (
                                    <button 
                                        key={genreId}
                                        onClick={() => removeFilter('genres', genreId)}
                                        className="flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 px-3 py-1 rounded-full text-xs font-medium hover:bg-indigo-500/30 transition-colors"
                                    >
                                        {GENRES_MAP[genreId] || genreId}
                                        <X size={12} />
                                    </button>
                                ))}
                                {filters.platforms.map(platformId => (
                                    <button 
                                        key={platformId}
                                        onClick={() => removeFilter('platforms', platformId)}
                                        className="flex items-center gap-1.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-3 py-1 rounded-full text-xs font-medium hover:bg-cyan-500/30 transition-colors"
                                    >
                                        {PLATFORMS_MAP[platformId] || platformId}
                                        <X size={12} />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Content */}
                        {!showDiscovery ? (
                            // Search/Filtered Results Grid
                            <div>
                                {isSearchLoading ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {[...Array(8)].map((_, i) => (
                                            <div key={i} className="aspect-[2/3] bg-slate-800 rounded-2xl animate-pulse"></div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {Array.isArray(searchResults) && searchResults.map(game => (
                                            <GameCard key={game.id} game={game} onClick={() => handleGameClick(game.id)} />
                                        ))}
                                        {Array.isArray(searchResults) && searchResults.length === 0 && (
                                            <div className="col-span-full py-20 text-center">
                                                <p className="text-gray-500 text-lg">No games found matching your criteria.</p>
                                                <button onClick={handleReset} className="mt-4 text-cyan-500 hover:underline">Clear all filters</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Discovery Sections (Only when NO filters/search)
                            <div className="space-y-16 animate-fade-in">
                                <GameSection title="Trending Now" games={trending?.data} isLoading={trending?.isLoading} onGameClick={handleGameClick} />
                                <GameSection title="Competitive Shooters" games={shooters?.data} isLoading={shooters?.isLoading} onGameClick={handleGameClick} />
                                <GameSection title="MMO & Raids" games={rpg?.data} isLoading={rpg?.isLoading} onGameClick={handleGameClick} />
                                <GameSection title="Chill & Co-op" games={coop?.data} isLoading={coop?.isLoading} onGameClick={handleGameClick} />
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Sidebar (Fixed/Sticky on Desktop) */}
                    <div className="w-full lg:w-[300px] flex-none">
                        <SidebarFilters 
                            filters={filters} 
                            onFilterChange={handleFilterChange} 
                            onReset={handleReset}
                            sortBy={sortBy}
                            onSortChange={setSortBy}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}
