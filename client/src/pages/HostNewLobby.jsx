import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/toast';
import { apiPost } from '../api/client';
import { Check } from 'lucide-react';
import GameSearch from '../features/lobby/gameSearch';
import { Gamepad2, Hash, AlignLeft, Tag } from 'lucide-react';
import { cn } from '../lib/utils';

// Tag Fetcher
const fetchTags = async () => {
    const res = await fetch('/api/tags');
    const data = await res.json();
    
    // Flatten tags if they are grouped, or use as is
    // The previous service implementation returned grouped tags { "Category": [...] }
    // But the user modified service to return array? Let's handle both.
    if (Array.isArray(data)) return data;
    
    // Check if it's an object with categories
    const allTags = [];
    Object.values(data).forEach(tags => allTags.push(...tags));
    return allTags;
};

const HostNewLobby = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [tags, setTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedGame, setSelectedGame] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: ''
    });

    useEffect(() => {
        fetchTags().then((data) => setTags(data));
    }, []);

    const handleTagChange = (tagId) => {
        setSelectedTags(prev => {
            if (prev.includes(tagId)) {
                return prev.filter(id => id !== tagId);
            } else {
                return [...prev, tagId];
            }
        });
    };

    const handleCreateLobby = async () => {
        if (!selectedGame) {
            toast({ title: "Error", description: "Please select a game", variant: "destructive" });
            return;
        }
        if (!formData.title.trim()) {
            toast({ title: "Error", description: "Please enter a lobby title", variant: "destructive" });
            return;
        }

        try {
            const payload = {
                gameId: selectedGame.id,
                title: formData.title,
                description: formData.description,
                tags: selectedTags,
                maxPlayers: 5 // Default for now
            };
            
            await apiPost('/api/lobbies', payload);
            
            toast({ title: "Success", description: "Lobby created successfully!" });
            navigate(`/game/${selectedGame.id}`);
        } catch (error) {
            toast({ title: "Error", description: error.message || "Failed to create lobby", variant: "destructive" });
        }
    };

    return (
        <div className="min-h-screen bg-[#1e2124] text-white font-sans selection:bg-[#7289da] selection:text-black">

            
            <div className="max-w-4xl mx-auto px-6 py-12 ">
                
                {/* Header */}
                <div className="text-center mb-12 space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Host a Lobby</h1>
                    <p className="text-gray-400 text-lg">Create a lobby and find your perfect teammates</p>
                </div>

                {/* Main Card */}
                <div className="bg-[#282b30] border-[#7289da]  rounded-xl p-8   space-y-8 ">
                    
                    {/* 1. Select Game */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[#7289da] font-semibold text-sm uppercase tracking-wide">
                            <Gamepad2 size={18} /> Select Game
                        </label>
                        <div className="relative">
                           <GameSearch onSelect={(game) => setSelectedGame(game)} />
                        </div>
                    </div>

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
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    {/* 3. Description */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[#7289da] font-semibold text-sm uppercase tracking-wide">
                            <AlignLeft size={18} /> Description
                        </label>
                        <textarea 
                            rows={3}
                            placeholder="Tell potential teammates what you're looking for..." 
                            className="w-full bg-[#424549] border border-[#7289da] rounded-lg px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:border-[#7289da] focus:ring-1 focus:ring-[#7289da] transition-all resize-none"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    {/* 4. Tags */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-[#7289da] font-semibold text-sm uppercase tracking-wide">
                                <Tag size={18} /> Tags
                            </label>
                            <span className="text-[#7289da] text-sm">({selectedTags.length} selected)</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                            {tags.map((tag) => {
                                const isSelected = selectedTags.includes(tag.id);
                                return (
                                    <div 
                                        key={tag.id}
                                        onClick={() => handleTagChange(tag.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg  cursor-pointer group transition-all duration-200 select-none",
                                            isSelected 
                                                ? " border-[#7289da]  text-[#7289da]" 
                                                : " border-[#7289da] text-gray-400 hover:border-[#7289da] hover:text-[#7289da]"
                                        )}
                                    >
                                        <div className={`w-5 h-5  border-2 !border-[#7289da] ${isSelected ? "bg-[#7289da]" : ""}`}>
                                            {isSelected && <Check size={18} className='text-black' />}
                                        </div>
                                        <span className="font-medium text-sm">{tag.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions - Just a submit button to complete the look */}
                    <div className="pt-4 flex justify-end">
                         <button 
                             onClick={handleCreateLobby}
                             className="bg-[#5865F2] text-gray-200 font-bold py-3 px-8 rounded-lg hover:bg-[#4752c4] hover:scale-105 transition-all ">
                             Create Lobby
                         </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HostNewLobby;
