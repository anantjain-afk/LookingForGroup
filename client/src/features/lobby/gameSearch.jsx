
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Input } from "../../components/ui/input"

export default function GameSearch() {
  const [search, setSearch] = useState("");

  const { data: games = [], isLoading, isError } = useQuery({ // <--- 1. Default to []
    queryKey: ['games', search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      
    const res = await axios.get(`/api/games?query=${search}`);
    console.log("Server Response:", res.data); 

      
      // 3. CRITICAL: Return res.data (the array), not res (the object)
      return res.data; 
    },
    enabled: search.length > 2,
  });

  // 4. Safety Check before rendering
  const gameList = Array.isArray(games) ? games : []; 
  console.log("Game List:", gameList); 

  return (
    <div className="space-y-4">
      <Input 
        placeholder="Search for a game..." 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      {/* Loading State */}
      {isLoading && <p className="text-sm text-gray-400">Searching...</p>}
      
      {/* Error State */}
      {isError && <p className="text-sm text-red-400">Failed to load games.</p>}

      {/* Results */}
      {gameList.length > 0 && (
        <div className="border border-slate-700 rounded-md bg-slate-900 p-2 max-h-60 overflow-y-auto">
          {gameList.map((game) => (
            <div 
              key={game.id} 
              className="flex items-center gap-3 p-2 hover:bg-slate-800 cursor-pointer rounded transition-colors"
              onClick={() => console.log("Selected:", game.name)}
            >
               {/* Handle missing images safely */}
               <img 
                 src={game.cover || "https://placehold.co/40x60?text=No+Img"} 
                 alt={game.name} 
                 className="w-10 h-14 object-cover rounded" 
               />
               <span className="text-slate-200 text-sm font-medium">{game.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}