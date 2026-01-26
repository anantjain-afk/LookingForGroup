import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function GameGrid() {
  const navigate = useNavigate();
  const { data: games = [], isLoading, isError } = useQuery({
    queryKey: ['popularGames'],
    queryFn: async () => {
      const res = await axios.get('/api/games');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="bg-slate-800 h-64 rounded-lg w-full"></div>
            <div className="bg-slate-800 h-4 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-red-400">Failed to load popular games.</p>;
  }

  // Safety check: Ensure games is an array
  const gameList = Array.isArray(games) ? games : [];
  
  if (!Array.isArray(games)) {
      console.error("GameGrid: 'games' is not an array:", games);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Popular Games</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {gameList.map((game) => (
          <div 
            key={game.id} 
            onClick={() => navigate(`/game/${game.id}`)}
            className="group relative bg-[#151515] rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-300 border border-transparent hover:border-[#5865F2] hover:shadow-[0_0_15px_rgba(60,255,0,0.2)]"
          >
            {/* Image Container */}
            <div className="aspect-[3/4] w-full relative">
              <img 
                src={game.cover || "https://placehold.co/300x400/1e293b/475569?text=No+Cover"} 
                alt={game.name} 
                className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-1">View Lobbies</span>
              </div>
            </div>
            
            {/* Game Info */}
            <div className="p-3">
              <h3 className="text-white font-bold truncate text-sm md:text-base group-hover:text-emerald-600 transition-colors">{game.name}</h3>
              {game.genres && game.genres.length > 0 && (
                <p className="text-gray-500 text-xs truncate mt-1">{game.genres.join(', ')}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
