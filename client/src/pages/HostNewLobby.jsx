import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { apiPost, apiGet } from "../api/client";
import GameSearch from "../features/lobby/gameSearch";
import { Gamepad2, Hash, AlignLeft, Tag, Users } from "lucide-react";
import { cn } from "../lib/utils";

// Tag Fetcher
const fetchTags = async () => {
  return await apiGet("/api/tags");
};

const HostNewLobby = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    data: tags = {},
    isLoading: loadingTags,
    isError: tagsFailed,
    refetch: retryTags,
  } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });
  const { data: options } = useQuery({
    queryKey: ["lobby-options"],
    queryFn: () => apiGet("/api/lobbies/options"),
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [params] = useSearchParams();
  const initialId = params.get("igdbId");
  const { data: initialGame } = useQuery({
    queryKey: ["game", initialId],
    queryFn: () => apiGet(`/api/games/${initialId}`),
    enabled: Boolean(initialId && /^[1-9]\d*$/.test(initialId)),
  });
  const [chosenGame, setSelectedGame] = useState(undefined);
  const selectedGame = chosenGame === undefined ? initialGame : chosenGame;
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    maxPlayers: 5,
    platformId: "",
    region: "",
    language: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleTagChange = (tagId) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      return prev.length < 12 ? [...prev, tagId] : prev;
    });
  };

  const handleCreateLobby = async () => {
    if (!selectedGame) {
      toast({
        title: "Error",
        description: "Please select a game",
        variant: "destructive",
      });
      return;
    }
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a lobby title",
        variant: "destructive",
      });
      return;
    }

    if (!formData.platformId || !formData.region) {
      toast({
        title: "Choose your platform and region",
        description: "Help teammates find a compatible lobby.",
        variant: "destructive",
      });
      return;
    }
    setIsCreating(true);
    try {
      const payload = {
        igdbId: selectedGame.igdbId,
        title: formData.title,
        description: formData.description,
        tags: selectedTags,
        maxPlayers: formData.maxPlayers,
        platformId: Number(formData.platformId),
        region: formData.region,
        language: formData.language,
      };

      const newLobby = await apiPost("/api/lobbies", payload);

      toast({ title: "Success", description: "Lobby created successfully!" });
      // Navigate to: /game/[gameId]/lobby/[lobbyId]
      navigate(`/lobby/${newLobby.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to create lobby",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e2124] text-white font-sans selection:bg-[#7289da] selection:text-black">
      <div className="max-w-4xl mx-auto px-6 py-12 ">
        {/* Header */}
        <div className="text-center mb-12 space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Host a Lobby</h1>
          <p className="text-gray-400 text-lg">
            Create a lobby and find your perfect teammates
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#282b30] border-[#7289da]  rounded-xl p-8   space-y-8 ">
          {/* 1. Select Game */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[#7289da] font-semibold text-sm uppercase tracking-wide">
              <Gamepad2 size={18} /> Select Game
            </label>
            <div className="relative">
              <GameSearch
                key={initialGame?.igdbId || "search"}
                initialGame={initialGame}
                onSelect={(game) => {
                  setSelectedGame(game);
                  setFormData((previous) => ({ ...previous, platformId: "" }));
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm text-gray-300">
              Platform
              <select
                aria-label="Lobby platform"
                value={formData.platformId}
                onChange={(e) =>
                  setFormData({ ...formData, platformId: e.target.value })
                }
                className="block mt-2 w-full bg-[#424549] p-3 rounded-lg"
                required
              >
                <option value="">Choose platform</option>
                {selectedGame?.onlinePlatforms?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {selectedGame && !selectedGame.onlinePlatforms?.length && (
                <span className="text-xs text-amber-300">
                  Online platforms for this game are awaiting review. Choose
                  another game for now.
                </span>
              )}
            </label>
            <label className="text-sm text-gray-300">
              Server region
              <select
                aria-label="Server region"
                value={formData.region}
                onChange={(e) =>
                  setFormData({ ...formData, region: e.target.value })
                }
                className="block mt-2 w-full bg-[#424549] p-3 rounded-lg"
                required
              >
                <option value="">Choose region</option>
                {options?.regions.map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-300">
              Language (optional)
              <input
                value={formData.language}
                onChange={(e) =>
                  setFormData({ ...formData, language: e.target.value })
                }
                placeholder="e.g. English"
                maxLength={40}
                className="block mt-2 w-full bg-[#424549] p-3 rounded-lg"
              />
            </label>
          </div>
          <p className="text-xs text-gray-400">
            Players should use the same platform and server region. Check the
            game’s cross-play settings before inviting other platforms.
          </p>
          {/* 2. Lobby Title */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-[#7289da] font-semibold text-sm uppercase tracking-wide">
              <Hash size={18} /> Lobby Title
            </label>
            <input
              type="text"
              placeholder="e.g., Looking for Ranked Squad - Silver+"
              className="w-full bg-[#424549] border border-[#7289da] rounded-lg px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#7289da] focus:ring-1 focus:ring-[#7289da] transition-all"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          {/* 3. Description & Max Players Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Description */}
            <div className="md:col-span-2 space-y-3">
              <label className="flex items-center gap-2 text-[#7289da] font-semibold text-sm uppercase tracking-wide">
                <AlignLeft size={18} /> Description
              </label>
              <textarea
                rows={3}
                placeholder="Tell potential teammates what you're looking for..."
                className="w-full bg-[#424549] border border-[#7289da] rounded-lg px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#7289da] focus:ring-1 focus:ring-[#7289da] transition-all resize-none"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* Max Players */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[#7289da] font-semibold text-sm uppercase tracking-wide">
                <Users size={18} /> Max Players
              </label>
              <select
                className="w-full bg-[#424549] border border-[#7289da] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#7289da] focus:ring-1 focus:ring-[#7289da] appearance-none"
                value={formData.maxPlayers}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxPlayers: parseInt(e.target.value),
                  })
                }
              >
                {(options?.capacities || [2, 3, 4, 5, 6, 8]).map((num) => (
                  <option key={num} value={num}>
                    {num} Players
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Tags */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[#7289da] font-semibold text-sm uppercase tracking-wide">
                <Tag size={18} /> Tags
              </h2>
              <span className="text-[#7289da] text-sm">
                ({selectedTags.length}/12 selected)
              </span>
            </div>

            <div className="space-y-6">
              {loadingTags ? (
                <p className="text-gray-400 text-sm">Loading tags...</p>
              ) : tagsFailed ? (
                <p role="alert" className="text-amber-300 text-sm">
                  Tags could not be loaded.{" "}
                  <button type="button" onClick={() => retryTags()} className="underline">Retry</button>
                </p>
              ) : Object.keys(tags).length ? (
                Object.entries(tags).map(([category, categoryTags]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-1">
                      {category}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categoryTags.map((tag) => {
                        const isSelected = selectedTags.includes(tag.id);
                        return (
                          <button
                            type="button"
                            key={tag.id}
                            aria-pressed={isSelected}
                            onClick={() => handleTagChange(tag.id)}
                            disabled={!isSelected && selectedTags.length >= 12}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-all duration-200 select-none text-sm focus-visible:outline-2 focus-visible:outline-[#7289da] disabled:opacity-40 disabled:cursor-not-allowed",
                              isSelected
                                ? "bg-[#7289da]/20 border-[#7289da] text-[#7289da]"
                                : "bg-[#2f3136] border-transparent text-gray-400 hover:text-white hover:bg-[#36393f]",
                            )}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-amber-300 text-sm">
                  No lobby tags are available yet. Ask the administrator to apply the latest database migrations.
                </p>
              )}
            </div>
          </div>

          {/* Actions - Just a submit button to complete the look */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleCreateLobby}
              disabled={isCreating}
              className={`bg-[#5865F2] text-gray-200 font-bold py-3 px-8 rounded-lg transition-all ${isCreating ? "opacity-50 cursor-not-allowed" : "hover:bg-[#4752c4] hover:scale-105"}`}
            >
              {isCreating ? "Creating..." : "Create Lobby"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostNewLobby;
