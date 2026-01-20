import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flame } from "lucide-react";
import Navbar from "../components/Navbar";

export default function ProfilePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      
      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-400 hover:text-[#3cff00] transition mb-6 group"
        >
          <div className="p-2 rounded-full bg-slate-800 group-hover:bg-[#3cff00]/10 transition">
             <ArrowLeft size={20} />
          </div>
          <span className="font-medium">Back</span>
        </button>

        {/* Top Banner & Header Section - Container relative for overlapping avatar */}
        <div className="relative mb-24">
            {/* Banner Placeholder */}
            <div className="w-full h-64 md:h-80 bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl overflow-hidden relative border border-white/5">
                 {/* Optional: Add an actual image or gradient overlay */}
                 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40"></div>
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"></div>
            </div>

            {/* Avatar & User Info - Overlapping Banner */}
            <div className="absolute -bottom-16 left-10 md:left-16 flex items-end gap-6">
                {/* Avatar Circle with Neon Border */}
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-slate-800 border-4 border-[#0a0a0a] ring-2 ring-[#3cff00] shadow-2xl overflow-hidden relative z-10">
                     <div className="w-full h-full bg-slate-700 flex items-center justify-center text-4xl text-gray-500">
                        {/* Placeholder for Avatar Image */}
                        <span className="sr-only">Avatar</span>
                     </div>
                </div>
                
                {/* Name & Title */}
                <div className="pb-2 md:pb-4 z-10">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl md:text-5xl font-bold text-white">Aliah Pitts</h1>
                        
                        {/* Karma Score */}
                        <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full">
                            <Flame size={18} className="text-orange-500 fill-orange-500" />
                            <span className="text-orange-500 font-bold text-sm md:text-base">1540 Karma</span>
                        </div>

                        <span className="bg-[#3cff00]/20 text-[#3cff00] text-xs font-bold px-2 py-1 rounded uppercase tracking-wider border border-[#3cff00]/30 hidden md:block">
                            Friends
                        </span>
                    </div>
                    <p className="text-gray-400 font-medium">Playing <span className="text-white">APEX LEGENDS</span></p>
                    <p className="text-xs text-gray-500 font-bold mt-1">LEVEL 154</p>
                </div>
            </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Sidebar (User Identity) */}
            <div className="space-y-8">
                {/* Bio */}
                <div className="space-y-4">
                    <p className="text-gray-300 leading-relaxed text-sm">
                        I enjoy playing a variety of games! Make sure to add me so we can play together. I occasionally stream on Twitch some FPS games with friends.
                    </p>
                </div>

                {/* Social Links Placeholder */}
                <div className="grid grid-cols-2 gap-3">
                    {/* BattleNet */}
                    <div className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition">
                        <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center text-blue-400 text-xs">BN</div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold">BattleNet</p>
                            <p className="text-xs text-white">alpitts</p>
                        </div>
                    </div>
                    {/* Xbox */}
                    <div className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition">
                        <div className="w-8 h-8 bg-green-500/20 rounded flex items-center justify-center text-green-400 text-xs">XB</div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold">Xbox</p>
                            <p className="text-xs text-white">apitts43</p>
                        </div>
                    </div>
                    {/* Twitch */}
                    <div className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition">
                         <div className="w-8 h-8 bg-purple-500/20 rounded flex items-center justify-center text-purple-400 text-xs">TW</div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold">Twitch</p>
                            <p className="text-xs text-white">twitch.tv/ap</p>
                        </div>
                    </div>
                    {/* Steam */}
                    <div className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition">
                        <div className="w-8 h-8 bg-slate-500/20 rounded flex items-center justify-center text-slate-400 text-xs">ST</div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold">Steam</p>
                            <p className="text-xs text-white">aliahpitts43</p>
                        </div>
                    </div>
                </div>

                {/* Activity / Top Games Placeholder */}
                 <div>
                    <h3 className="text-lg font-bold text-white mb-4">Activity</h3>
                     <div className="bg-gradient-to-r from-red-900/40 to-slate-900 border border-white/5 rounded-xl p-4 flex gap-4 items-center relative overflow-hidden group hover:border-red-500/30 transition">
                         <div className="w-16 h-16 bg-red-600 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-black transform group-hover:scale-105 transition">APEX</div>
                         <div className="z-10">
                            <h4 className="font-bold text-white text-sm">Playing APEX LEGENDS <span className="text-gray-500 text-xs font-normal ml-1">for 2h</span></h4>
                            <p className="text-gray-400 text-xs mt-1">Bangalore - Solo ranked match in Olympus Diamond 3</p>
                            <div className="flex gap-2 mt-2">
                                <button className="px-3 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded hover:bg-green-500/20 transition uppercase border border-green-500/20">
                                    Join Game →
                                </button>
                            </div>
                         </div>
                    </div>
                </div>

                 {/* Top Games Grid Placeholder */}
                 <div>
                    <h3 className="text-lg font-bold text-white mb-4">Top Games</h3>
                    <div className="grid grid-cols-4 gap-2">
                         <div className="aspect-square bg-slate-800 rounded-lg border border-white/5 hover:border-white/20 transition cursor-pointer"></div>
                         <div className="aspect-square bg-slate-800 rounded-lg border border-white/5 hover:border-white/20 transition cursor-pointer"></div>
                         <div className="aspect-square bg-slate-800 rounded-lg border border-white/5 hover:border-white/20 transition cursor-pointer"></div>
                         <div className="aspect-square bg-slate-800 rounded-lg border border-white/5 hover:border-white/20 transition cursor-pointer"></div>
                    </div>
                 </div>
            </div>

            {/* Right Column: Stats, Ranks, Achievements */}
            <div className="lg:col-span-2 space-y-10">
                
                {/* Ranks Section Placeholder */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Ranks</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                         {/* Rank Placeholder Items */}
                        {[1, 2, 3, 4, 5].map((i) => (
                             <div key={i} className="bg-slate-900/50 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-800/50 transition cursor-pointer group">
                                <div className="w-12 h-12 bg-slate-700/50 rounded-full group-hover:bg-slate-700 transition"></div>
                                <div className="text-center">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Apex Legends</p>
                                    <p className="text-xs font-bold text-white">Diamond III</p>
                                </div>
                             </div>
                        ))}
                    </div>
                </div>

                {/* Achievements Section Placeholder */}
                 <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Achievements</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {/* Achievement Circular Progress Placeholders */}
                         {[
                            { label: "10 perfect games", val: "6", total: "10", color: "text-cyan-400", border: "border-cyan-400" }, 
                            { label: "100 kills", val: "65", total: "100", color: "text-blue-500", border: "border-blue-500" },
                            { label: "Add 50 friends", val: "15", total: "50", color: "text-indigo-500", border: "border-indigo-500" },
                            { label: "Own 20 games", val: "20", total: "20", color: "text-emerald-400", border: "border-emerald-400" }
                         ].map((item, idx) => (
                            <div key={idx} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                                <p className="text-[10px] text-gray-400 mb-4 font-medium">{item.label}</p>
                                <div className={`w-20 h-20 rounded-full border-4 ${item.border} border-t-transparent border-l-transparent flex items-center justify-center relative`}>
                                     <span className="text-xl font-bold text-white">{item.val}<span className="text-xs text-gray-500">/{item.total}</span></span>
                                </div>
                            </div>
                         ))}
                    </div>
                </div>

                {/* Stats Section Placeholder */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Stats</h3>
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 h-64 flex items-center justify-center relative">
                        <p className="text-gray-500 text-sm">Graph Placeholder (Hours per day)</p>
                        {/* Placeholder line graph lines */}
                        <div className="absolute bottom-10 left-10 right-10 top-20 flex items-end justify-between px-4">
                             {[40, 60, 45, 70, 50, 80, 75, 90, 85].map((h, i) => (
                                <div key={i} style={{ height: `${h}%` }} className="w-full mx-1 bg-gradient-to-t from-emerald-500/20 to-transparent border-t-2 border-emerald-500/50 rounded-t"></div>
                             ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
}
