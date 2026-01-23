import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { useUserStore } from "../store/useUserStore";

import GameSearch from "../features/lobby/gameSearch";
import GameGrid from "../features/lobby/GameGrid";
export default function LandingPage() {
  const navigate = useNavigate();
  const user = useUserStore((state) => state.user);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">


      {/* Hero Section */}
      <div className="relative flex flex-col md:flex-row items-center justify-between px-6 md:px-16 py-6 md:py-10 max-w-7xl mx-auto">
        
        {/* Left Content */}
        <div className="flex-1 w-full max-w-2xl z-10 space-y-8">
            <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                    Find Your <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                        Perfect Squad
                    </span>
                </h1>
                <p className="text-gray-400 text-lg md:text-xl max-w-lg">
                    Stop solo queuing into toxicity. Find teammates who match your vibe, rank, and game mode instantly.
                </p>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-lg w-full group">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl group-hover:bg-green-500/30 transition duration-500"></div>
                <div className="relative flex items-center bg-[#1a1a1a] border border-gray-800 rounded-full p-2 shadow-2xl">
                    <div className="pl-4 text-gray-500">
                        <Search size={24} />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search game..." 
                        className="w-full bg-transparent text-white px-4 py-3 focus:outline-none placeholder-gray-500 text-lg"
                    />
                    <button className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full transition duration-300">
                        <Search size={20} />
                    </button>
                </div>
            </div>

            {/* Top Searches */}
            <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Top Searches:</p>
                <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                    <span className="hover:text-emerald-400 cursor-pointer transition">Valorant Ranked,</span>
                    <span className="hover:text-emerald-400 cursor-pointer transition">CS2 Premier,</span>
                    <span className="hover:text-emerald-400 cursor-pointer transition">Apex Legends Chill,</span>
                    <span className="hover:text-emerald-400 cursor-pointer transition">League of Legends ARAM,</span>
                    <span className="hover:text-emerald-400 cursor-pointer transition">Overwatch 2 Comp...</span>
                </div>
            </div>

            {/* CTA Button - Only show if user is NOT logged in */}
            {!user && (
                <div className="pt-4">
                    <button 
                        onClick={() => navigate("/register")}
                        className="flex items-center gap-2 bg-[#5865F2] text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-[#4752c4] transition " 
                    >
                        Get Started <ArrowRight size={20} />
                    </button>
                     {/* Re-styling button to match requested specs strictly */}
                     <style jsx>{`
                        .custom-cta {
                            background-color: #e5e7eb; /* gray-200 */
                            color: #111827; /* gray-900 */
                        }
                        .custom-cta:hover {
                            background-color: #d1d5db; /* gray-300 */
                        }
                     `}</style>
                </div>
            )}
        </div>

        {/* Right Image */}
        <div className="flex-1 w-full relative mt-12 md:mt-0 flex justify-end">
            {/* 
              Using a mask-image to blend the image into the background.
              The gradient goes from transparent (left) to black (right) to show the image,
              and we also mask the bottom to blend it in.
            */}
            <div className="relative w-full max-w-[800px] z-0">
                <img 
                    src="/landingPage.png" 
                    alt="Game Characters" 
                    className="w-full h-auto object-contain mask-image-gradient"
                    style={{
                        maskImage: 'linear-gradient(to right, transparent, black 20%), linear-gradient(to top, transparent, black 20%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%), ' + 
                                        'linear-gradient(to top, transparent 0%, black 20%)',
                        maskComposite: 'intersect',
                        WebkitMaskComposite: 'source-in'
                    }}
                />
                 {/* Fallback/Additional overlay for smoother blend if mask isn't enough or for specific aesthetic */}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#0a0a0a] z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-10"></div>
            </div>
             {/* Decorative Elements */}
             <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
        </div>
      </div>

       {/* Lobbies Section */}
       <div className="px-6 md:px-16 py-12 max-w-7xl mx-auto border-t border-gray-800">
            {/* Conditional Content */}
            {!user ? (
                 <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 text-center space-y-4">
                    <p className="text-gray-400">Join <span className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-lg px-2 py-1 text-white hover:text-gray-100 text-lg font-semibold">LFG</span> to see and create lobbies.</p>
                    <button 
                        onClick={() => navigate("/login")}
                        className="text-emerald-500 hover:text-emerald-400 font-medium hover:underline"
                    >
                        Login to access lobbies
                    </button>
                    {/* Publicly visible popular games could go here too if desired, usually standard pattern */}
                </div>
            ) : (
                <div className="space-y-12">
                     {/* Search - Keeping existing placeholder or componente */}
                     <div className="max-w-md">
                        <GameSearch /> 
                     </div>
                     
                     {/* Popular Games Grid */}
                     <GameGrid />
                </div>
            )}
       </div>

    </div>
  );
}
