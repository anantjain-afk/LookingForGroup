import { useState, useEffect } from 'react';

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

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#3cff00] selection:text-black">

            
            <div className="max-w-4xl mx-auto px-6 py-12 ">
                
                {/* Header */}
                <div className="text-center mb-12 space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Host a Lobby</h1>
                    <p className="text-gray-400 text-lg">Create a lobby and find your perfect teammates</p>
                </div>

                {/* Main Card */}
                <div className="bg-[#111] border border-[#d71616]  rounded-xl p-8 shadow-xl shadow-[#97d752]   space-y-8 ">
                    
                    {/* 1. Select Game */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[#3cff00] font-semibold text-sm uppercase tracking-wide">
                            <Gamepad2 size={18} /> Select Game
                        </label>
                        <div className="relative">
                           <GameSearch onSelect={(game) => setSelectedGame(game)} />
                        </div>
                    </div>

                    {/* 2. Lobby Title */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[#3cff00] font-semibold text-sm uppercase tracking-wide">
                            <Hash size={18} /> Lobby Title
                        </label>
                        <input 
                            type="text" 
                            placeholder="e.g., Looking for Ranked Squad - Silver+" 
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#3cff00] focus:ring-1 focus:ring-[#3cff00] transition-all"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </div>

                    {/* 3. Description */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[#3cff00] font-semibold text-sm uppercase tracking-wide">
                            <AlignLeft size={18} /> Description
                        </label>
                        <textarea 
                            rows={3}
                            placeholder="Tell potential teammates what you're looking for..." 
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#3cff00] focus:ring-1 focus:ring-[#3cff00] transition-all resize-none"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    {/* 4. Tags */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-[#3cff00] font-semibold text-sm uppercase tracking-wide">
                                <Tag size={18} /> Tags
                            </label>
                            <span className="text-gray-500 text-sm">({selectedTags.length} selected)</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {tags.map((tag) => {
                                const isSelected = selectedTags.includes(tag.id);
                                return (
                                    <div 
                                        key={tag.id}
                                        onClick={() => handleTagChange(tag.id)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer group transition-all duration-200 select-none",
                                            isSelected 
                                                ? "bg-[#3cff00]/10 border-[#3cff00] text-white" 
                                                : "bg-[#1a1a1a] border-[#333] text-gray-400 hover:border-gray-500 hover:text-gray-300"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                            isSelected ? "border-[#3cff00] bg-[#3cff00]" : "border-gray-600 group-hover:border-gray-500"
                                        )}>
                                            {isSelected && (
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M10 3L4.5 8.5L2 6" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            )}
                                        </div>
                                        <span className="font-medium text-sm">{tag.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions - Just a submit button to complete the look */}
                    <div className="pt-4 flex justify-end">
                         <button className="bg-[#3cff00] text-black font-bold py-3 px-8 rounded-lg hover:bg-[#32d500] hover:scale-105 transition-all shadow-[0_0_20px_rgba(60,255,0,0.3)]">
                             Create Lobby
                         </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HostNewLobby;
