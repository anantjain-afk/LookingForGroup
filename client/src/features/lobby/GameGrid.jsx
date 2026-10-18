import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../api/client';

export default function GameGrid({ limit = 10 }) {
  const { data: games = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['landingGames', 'shooters', limit],
    queryFn: async () => {
      const res = await apiGet(`/api/games?category=shooters&limit=${limit}`);
      return res.games;
    }
  });

  if (isLoading) {
    return (
      <div className="grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Loading games">
        {Array.from({ length: limit }, (_, i) => (
          <div key={i} className="animate-pulse space-y-3" aria-hidden="true">
            <div className="aspect-[3/4] rounded-xl bg-[#202020]" />
            <div className="h-4 w-3/4 rounded bg-[#202020]" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl bg-[#151515] p-6 text-gray-300">
        <p>Games could not load right now.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 font-semibold text-emerald-300 underline underline-offset-4 hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
        >
          Try again
        </button>
      </div>
    );
  }

  const gameList = Array.isArray(games) ? games.slice(0, limit) : [];

  if (gameList.length === 0) {
    return <p className="text-gray-300">No games to show yet. Try searching from Browse games.</p>;
  }

  return (
    <div className="grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3">
      {gameList.map((game) => (
        <Link
          key={game.igdbId}
          to={`/game/${game.igdbId}`}
          className="group overflow-hidden rounded-xl bg-[#151515] transition-colors hover:bg-[#202020] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
        >
          <div className="aspect-[3/4] overflow-hidden bg-[#202020]">
            {game.cover && (
              <img src={game.cover} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
            )}
          </div>
          <div className="px-3 py-3">
            <h3 className="truncate text-sm font-semibold text-white md:text-base">{game.name}</h3>
            <p className="mt-1 text-xs text-gray-300">View lobbies</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
