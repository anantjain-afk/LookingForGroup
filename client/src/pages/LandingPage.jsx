import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useUserStore } from "../store/useUserStore";
import GameGrid from "../features/lobby/GameGrid";

export default function LandingPage() {
  const user = useUserStore((state) => state.user);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <section className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-12 md:px-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-4 lg:py-16">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl">
            Find people to <span className="block text-emerald-400">play with.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-300 md:text-xl">
            Pick a game, see its lobbies, and find a group that fits how you play.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/browse"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-[#0a0a0a] transition-colors hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
            >
              Browse games <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              to={user ? "/host-new-lobby" : "/register"}
              className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 py-3 font-semibold text-white underline decoration-gray-500 underline-offset-4 transition-colors hover:text-emerald-300 hover:decoration-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
            >
              {user ? "Host a lobby" : "Create an account"}
            </Link>
          </div>
          {!user && (
            <p className="mt-5 text-sm text-gray-400">
              You can browse without an account. A verified account is needed to join or host.
            </p>
          )}
        </div>
        <div className="pointer-events-none flex justify-center lg:justify-end">
          <img
            src="/landingPage.png"
            alt=""
            className="block h-auto w-full max-w-[260px] mix-blend-screen sm:max-w-[320px] lg:max-w-[350px]"
            style={{
              maskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 75%, transparent 100%)",
            }}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-gray-800 px-6 py-12 md:px-16 md:py-16" aria-label="Explore games">
        {user?.favoriteGames?.length > 0 && (
          <div className="mb-14">
            <h2 className="mb-6 text-2xl font-bold">Your favorite games</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {user.favoriteGames.map((game) => (
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
                  <h3 className="truncate px-3 py-3 text-sm font-semibold text-white md:text-base">{game.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Pick a game</h2>
            <p className="mt-2 text-gray-300">Open a game to see its lobbies.</p>
          </div>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 font-semibold text-emerald-300 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
          >
            See all games <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <GameGrid limit={3} />
      </section>

      <section className="mx-auto max-w-7xl border-t border-gray-800 px-6 py-12 md:px-16 md:py-16">
        <h2 className="text-2xl font-bold md:text-3xl">How it works</h2>
        <div className="mt-8 grid gap-8 text-gray-300 md:grid-cols-3">
          <div>
            <h3 className="mb-2 font-semibold text-white">Browse a game</h3>
            <p>Search for the game you want to play.</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-white">Choose a lobby</h3>
            <p>Check the group details and find one that suits you.</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-white">Join or start one</h3>
            <p>Join a group, or host a lobby for others to find.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
