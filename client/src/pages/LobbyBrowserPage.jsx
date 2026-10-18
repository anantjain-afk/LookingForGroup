import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../hooks/useToast";
import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, Search, X, Heart } from "lucide-react";
import { useUserStore } from "../store/useUserStore";
import { formatDistanceToNow } from "date-fns";
import { apiGet, apiPost, apiDelete } from "../api/client";
import { cn } from "../lib/utils";
import UserProfileLink from "../components/UserProfileLink";

// API Fetchers
const fetchGameDetails = async (gameId) => {
  return await apiGet(`/api/games/${gameId}`);
};

const fetchGameLobbies = async (gameId, tagIds, matching) => {
  let url = `/api/games/${gameId}/lobbies`;
  if (tagIds && tagIds.length > 0) {
    url += `?tags=${tagIds.join(",")}`;
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(matching || {}))
    if (value) params.set(key, value);
  if (params.size) url += `${url.includes("?") ? "&" : "?"}${params}`;
  return await apiGet(url);
};

const fetchTags = async () => {
  return await apiGet("/api/tags");
};

export default function LobbyBrowserPage() {
  const { gameId } = useParams();
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const { user, updateUser } = useUserStore();
  const { toast } = useToast();
  const [region, setRegion] = useState("");
  const [language, setLanguage] = useState("");
  const debouncedLanguage = useDebouncedValue(language);
  const { data: options } = useQuery({
    queryKey: ["lobby-options"],
    queryFn: () => apiGet("/api/lobbies/options"),
  });
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);

  // Queries
  const { data: game, isLoading: loadingGame } = useQuery({
    queryKey: ["game", gameId],
    queryFn: () => fetchGameDetails(gameId),
  });

  const {
    data: lobbies,
    isLoading: loadingLobbies,
    isError: lobbiesFailed,
    error: lobbyError,
    refetch: retryLobbies,
  } = useQuery({
    queryKey: [
      "lobbies",
      gameId,
      selectedTagIds,
      region,
      debouncedLanguage,
    ], // Include selectedTagIds in queryKey
    queryFn: () =>
      fetchGameLobbies(gameId, selectedTagIds, {
        region,
        language: debouncedLanguage,
      }),
    refetchInterval: 10000,
    staleTime: 0,
  });

  const {
    data: tags = {},
    isLoading: isLoadingTags,
    isError: tagsFailed,
    refetch: retryTags,
  } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  // Handlers
  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : prev.length < 12 ? [...prev, tagId] : prev,
    );
  };

  const hasFilters =
    selectedTagIds.length > 0 || region || language;
  const clearFilters = () => {
    setSelectedTagIds([]);
    setRegion("");
    setLanguage("");
  };

  // Derived state
  const activeLobbyCount = lobbies?.length || 0;

  // Check if current game is in favorites
  const isFavorite = user?.favoriteGames?.some(
    (g) => g.igdbId === game?.igdbId,
  );

  const toggleFavorite = async () => {
    if (!user || !game || isUpdatingFavorite) return;

    setIsUpdatingFavorite(true);
    try {
      let updatedGames;
      const idToUse = game.igdbId;

      if (isFavorite) {
        updatedGames = await apiDelete(`/api/me/favorites/${idToUse}`);
      } else {
        updatedGames = await apiPost(`/api/me/favorites/${idToUse}`);
      }

      updateUser({ ...user, favoriteGames: updatedGames });
    } catch (error) {
      toast({
        title: "Could not update favorites",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  if (loadingGame) {
    return (
      <div className="min-h-screen bg-[#1e2124] flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-[#1e2124] flex items-center justify-center text-white">
        Game not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1e2124] font-sans selection:bg-[#7289da] selection:text-white pb-20">
      {/* 1. HERO HEADER */}
      <div className="relative h-80 w-full overflow-hidden group">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{
            backgroundImage: `url(${game.cover || "/placeholder-game.jpg"})`,
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#1e2124] via-[#1e2124]/60 to-transparent" />

        <div className="absolute bottom-0 left-0 w-full p-8 pb-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-widest uppercase drop-shadow-2xl">
              {game.name}
            </h1>
            <p className="font-medium text-lg mt-2 text-emerald-500 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {activeLobbyCount} Active Lobbies
            </p>
          </div>

          {user && (
            <button
              onClick={toggleFavorite}
              disabled={isUpdatingFavorite}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg",
                isFavorite
                  ? "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20"
                  : "bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20",
              )}
            >
              <Heart
                size={20}
                className={cn(isFavorite ? "fill-red-500" : "")}
              />
              {isFavorite ? "Favorited" : "Add to Favorites"}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10 space-y-6">
        <div className="bg-[#282b30] rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-xs text-gray-400">
            Server region
            <select
              aria-label="Filter server region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="block w-full bg-[#1e2124] mt-2 p-3 rounded text-gray-200 text-sm"
            >
              <option value="">Any region</option>
              {options?.regions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-400">
            Language
            <input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              maxLength={40}
              placeholder="Any language"
              className="block w-full bg-[#1e2124] mt-2 p-3 rounded text-gray-200 text-sm"
            />
          </label>
        </div>
        <div className="flex justify-end">
          <Link
            to={`/host-new-lobby?igdbId=${game.igdbId}`}
            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-5 py-3 font-bold text-sm"
          >
            Host a lobby for {game.name}
          </Link>
        </div>
        {/* 2. FILTER CONTAINER */}
        <div className="bg-[#282b30]/90 backdrop-blur-md border border-[#7289da]/30 rounded-xl p-6 shadow-2xl">
          <div className="flex flex-col gap-4">
            {/* Search / Header Row */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-4 mb-2">
              <h3 className="text-[#dbdee1] font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                <Search size={14} /> Find a Lobby
              </h3>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-bold transition-colors"
                >
                  <X size={12} /> Clear Filters
                </button>
              )}
            </div>

            {/* Tags Row */}
            <div className="space-y-6 pt-2">
              <p className="text-xs text-gray-400">Lobby tags ({selectedTagIds.length}/12 selected)</p>
              {isLoadingTags ? (
                <div className="text-gray-500 text-xs">Loading tags...</div>
              ) : tagsFailed ? (
                <p role="alert" className="text-amber-300 text-sm">
                  Tags could not be loaded.{" "}
                  <button type="button" onClick={() => retryTags()} className="underline">Retry</button>
                </p>
              ) : Object.keys(tags).length ? (
                Object.entries(tags).map(([category, categoryTags]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-[#96989d] text-[10px] font-bold uppercase tracking-widest pl-1">
                      {category}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {categoryTags.map((tag) => (
                        <FilterPill
                          key={tag.id}
                          label={tag.name}
                          active={selectedTagIds.includes(tag.id)}
                          disabled={selectedTagIds.length >= 12 && !selectedTagIds.includes(tag.id)}
                          onClick={() => toggleTag(tag.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-amber-300 text-sm">No lobby tags are available yet. Ask the administrator to apply the latest database migrations.</p>
              )}
            </div>
          </div>
        </div>

        {/* 3. LOBBY LIST */}
        <div className="space-y-4">
          {lobbiesFailed ? (
            <div
              role="alert"
              className="p-6 rounded-xl bg-red-950/30 text-red-200"
            >
              <p>{lobbyError.message}</p>
              <button onClick={() => retryLobbies()} className="underline mt-3">
                Retry
              </button>
            </div>
          ) : loadingLobbies ? (
            <div className="text-gray-400 text-center py-10">
              Loading active lobbies...
            </div>
          ) : activeLobbyCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-[#282b30] rounded-xl border border-dashed border-gray-700">
              <Users size={48} className="text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-300">
                {hasFilters ? "No Matches Found" : "No Lobbies Found"}
              </h3>
              <p className="text-gray-500 mt-2">
                {hasFilters
                  ? "No lobbies match these specific filters. Try changing the matching filters."
                  : `Be the first to host a lobby for ${game.name}!`}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm text-[#7289da] hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            lobbies.map((lobby) => <LobbyCard key={lobby.id} lobby={lobby} />)
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components

function FilterPill({ label, active = false, disabled = false, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded text-xs font-semibold transition-all shadow-sm border focus-visible:outline-2 focus-visible:outline-[#7289da] disabled:opacity-40 disabled:cursor-not-allowed",
        active
          ? "bg-[#5865F2] text-white border-[#5865F2] shadow-[0_0_10px_rgba(88,101,242,0.4)]"
          : "bg-[#36393f] text-gray-400 border-transparent hover:bg-[#424549] hover:text-gray-200",
      )}
    >
      {label}
    </button>
  );
}

function LobbyCard({ lobby }) {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const isFull = lobby.participants.length >= lobby.maxPlayers;
  const isMember = lobby.participants.some((p) => p.userId === user?.id);
  const isMe = user?.username === lobby.host?.username;

  return (
    <div className="group bg-[#282b30] hover:bg-[#32353b] border border-[#2f3136] hover:border-[#7289da] rounded-lg p-5 transition-all duration-200 shadow-lg relative overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
        {/* Left Content */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between md:justify-start md:gap-4">
            <h3 className="text-lg font-bold text-white group-hover:text-[#7289da] transition-colors truncate">
              {lobby.title}
            </h3>
            <span className="text-xs font-medium text-gray-500 bg-[#202225] px-2 py-0.5 rounded flex items-center gap-1">
              Hosted by{" "}
              <UserProfileLink
                username={lobby.host?.username}
                alias={isMe ? "You" : undefined}
                className="text-gray-400 hover:text-[#5865F2]"
              />
            </span>
          </div>

          <p className="text-gray-400 text-sm line-clamp-1">
            {lobby.description || "No description provided."}
          </p>

          {/* Metadata Row */}
          <div className="flex items-center gap-4 text-xs font-medium text-gray-400 pt-2">
            <div
              className={cn(
                "flex items-center gap-1.5",
                isFull ? "text-red-400" : "text-emerald-600",
              )}
            >
              <Users size={14} />
              <span>
                {lobby.participants.length}/{lobby.maxPlayers} Players
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>
                {formatDistanceToNow(new Date(lobby.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 pt-2">
            {lobby.region || "Region unspecified"}
            {lobby.language ? ` · ${lobby.language}` : ""}
          </p>
          <div
            className="flex gap-1 pt-3"
            aria-label={`${lobby.participants.length} of ${lobby.maxPlayers} party slots filled`}
          >
            {Array.from({ length: Math.min(lobby.maxPlayers, 20) }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 w-5 rounded-full ${i < lobby.participants.length ? "bg-emerald-500" : "bg-gray-600"}`}
              />
            ))}
          </div>
          {/* Tags Row */}
          <div className="flex flex-wrap gap-2 pt-1">
            {lobby.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] uppercase font-bold text-[#eaecef] bg-[#3a6ab1] border border-gray-700 px-2 py-0.5 rounded-sm"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        {/* Right Action */}
        <div className="flex items-center">
          <button
            onClick={() =>
              (!isFull || isMember) && navigate(`/lobby/${lobby.id}`)
            }
            disabled={isFull && !isMember}
            className={cn(
              "w-full md:w-auto px-6 py-2.5 rounded-md font-bold text-sm transition-all shadow-md",
              isFull && !isMember
                ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                : "bg-[#5865F2] hover:bg-[#4752c4] text-white",
            )}
          >
            {isMember ? "Rejoin Lobby" : isFull ? "Full" : "Join Lobby"}
          </button>
        </div>
      </div>
    </div>
  );
}
