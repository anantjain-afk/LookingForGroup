
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Input } from "../../components/ui/input"

export default function GameSearch({ onSelect }) {
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);

  const { data: games = [], isLoading, isError } = useQuery({ // <--- 1. Default to []
    queryKey: ['games', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      
    const res = await apiGet(`/api/games?query=${search}`);
    // console.log("Server Response:", res.data); 

      
      // 3. CRITICAL: Return res.data (the array), not res (the object)
      return res.data; 
    },
    enabled: search.length > 2,
  });

  // 4. Safety Check before rendering
  const gameList = Array.isArray(games) ? games : []; 
  // console.log("Game List:", gameList); 

  const handleSelect = (game) => {
    setSelectedGame(game);
    setSearch(game.name); // Optional: Update input to show selected name
    if (onSelect) onSelect(game);
  };

  return (
    <div className="space-y-4">
      <Input 
        placeholder="Choose a game..." 
        value={search}
        onChange={(e) => {
            setSearch(e.target.value);
            setSelectedGame(null); // Clear selection on edit
        }}
        className="bg-[#424549] border-[#7289da] text-white focus:ring-[#7289da] focus:border-[#7289da] placeholder:text-gray-400"
      />
      
      {/* Loading State */}
      {isLoading && <p className="text-sm text-gray-400">Searching...</p>}
      
      {/* Error State */}
      {isError && <p className="text-sm text-red-400">Failed to load games.</p>}

      {/* Results Dropdown */}
      {gameList.length > 0 && !selectedGame && (
        <div className="border border-[#7289da] rounded-md bg-[#424549] p-2 max-h-60 overflow-y-auto mt-2 absolute z-10 w-full max-w-2xl shadow-xl">
          {gameList.map((game) => (
            <div 
              key={game.id} 
              className="flex items-center gap-3 p-2 hover:bg-[#7289da] cursor-pointer rounded transition-colors"
              onClick={() => handleSelect(game)}
            >
               {/* Handle missing images safely */}
               <img 
                 src={game.cover || "https://placehold.co/40x60?text=No+Img"} 
                 alt={game.name} 
                 className="w-8 h-12 object-cover rounded" 
               />
               <span className="text-gray-200 text-sm font-medium">{game.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}