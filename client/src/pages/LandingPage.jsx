import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
             <div className="absolute -top-4 -left-6 z-20 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#1a1a1a] border border-gray-800 shadow-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
                <span className="text-[10px] uppercase tracking-widest text-white font-bold">Chill Vibe</span>
             </div>
             <div className="absolute -top-6 right-8 z-20 hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a1a] border border-gray-800 shadow-xl">
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Mic Required 🎙️</span>
             </div>

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

      {!user && (
        <>
          {/* 3 Simple Steps */}
      <div className="px-6 md:px-16 py-16 max-w-7xl mx-auto border-t border-gray-800">
        <div className="flex flex-col items-center text-center space-y-3 mb-12">
          <span className="text-emerald-500 font-bold tracking-widest uppercase">Three Simple Steps</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white uppercase">How LFG Solves Solo Queue</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 flex flex-col justify-between hover:border-emerald-500/50 transition">
            <div className="space-y-4">
              <span className="text-emerald-500 font-black tracking-widest uppercase text-sm">01 / DISCOVERY</span>
              <h3 className="text-2xl font-bold text-white">Pick Your Game & Mode</h3>
              <p className="text-gray-400">Select your competitive arena. LFG instantly taps into global telemetry to match you against active scrim boards in your regional server cluster.</p>
            </div>
            
            <div className="mt-8 space-y-2 p-4 rounded-xl bg-[#0a0a0a] border border-gray-800">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1a1a] border border-gray-800">
                <span className="text-sm font-semibold text-white">Valorant</span>
                <span className="text-xs text-emerald-500 font-semibold">3,420 Active</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1a1a] border border-gray-800">
                <span className="text-sm font-semibold text-white">Apex Legends</span>
                <span className="text-xs text-gray-400">1,890 Active</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#1a1a1a] border border-gray-800">
                <span className="text-sm font-semibold text-white">Counter-Strike 2</span>
                <span className="text-xs text-emerald-500 font-semibold">2,110 Active</span>
              </div>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 flex flex-col justify-between hover:border-emerald-500/50 transition">
            <div className="space-y-4">
              <span className="text-emerald-500 font-black tracking-widest uppercase text-sm">02 / COMPATIBILITY</span>
              <h3 className="text-2xl font-bold text-white">Select Your Exact Vibe</h3>
              <p className="text-gray-400">Tired of silent players? Looking for zero rage? Select your team culture tags to instantly eliminate mismatch friction before stepping on the field.</p>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-[#0a0a0a] border border-gray-800 flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500 text-[#0a0a0a] text-xs font-bold">
                Mic Required
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-gray-800 text-white text-xs font-semibold">
                No Backseating
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                Rank Push 🏆
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-gray-800 text-white text-xs font-semibold">
                21+ Chill Only
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                Positive Vibes
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 flex flex-col justify-between hover:border-emerald-500/50 transition">
            <div className="space-y-4">
              <span className="text-emerald-500 font-black tracking-widest uppercase text-sm">03 / DEPLOYMENT</span>
              <h3 className="text-2xl font-bold text-white">Lock In & Dominate</h3>
              <p className="text-gray-400">Hop into ultra-clear spatial voice chat with real-time mic checks. Seamlessly launch the game client and queue up together with zero awkward delays.</p>
            </div>

            <div className="mt-8 p-4 rounded-xl bg-[#0a0a0a] border border-gray-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-gray-800 flex items-center justify-center font-bold text-xs text-white">K</div>
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-gray-800 flex items-center justify-center font-bold text-xs text-white">V</div>
                  <div className="w-8 h-8 rounded-full bg-[#1a1a1a] border border-gray-800 flex items-center justify-center font-bold text-xs text-white">N</div>
                  <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-500 flex items-center justify-center font-bold text-xs text-white">A</div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500 border border-white flex items-center justify-center font-bold text-xs text-[#0a0a0a]">YOU</div>
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Voice Synced</span>
                </div>
              </div>
              <div className="w-full py-2.5 rounded-lg bg-[#1a1a1a] border border-gray-800 text-white text-xs uppercase tracking-wider font-extrabold flex items-center justify-center gap-2">
                <span>Launch Valorant & Invite</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Engineered For Flawless Synergy */}
      <div className="px-6 md:px-16 py-16 max-w-7xl mx-auto border-t border-gray-800">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <span className="text-emerald-500 font-bold tracking-widest uppercase text-sm">Built for Competitive Players</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white uppercase">Engineered For Flawless Synergy</h2>
          </div>
          <p className="text-gray-400 max-w-md">
            Say goodbye to toxic throwers, rage-quitters, and incompatible playstyles. Our system enforces accountability without compromising privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 space-y-6 hover:border-emerald-500/50 transition flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">Karma & Sportsmanship</h3>
              <p className="text-gray-400">Every squad session ends with quick peer feedback. Toxic quitters get demoted, ensuring you only play with verified teammates.</p>
            </div>
            <div className="p-4 bg-[#0a0a0a] border border-gray-800 rounded-lg">
              <div className="flex justify-between text-sm mb-2"><span className="text-white font-bold uppercase">Trust Tier</span><span className="text-emerald-500 font-bold">99.8</span></div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full"><div className="w-[98%] h-full bg-emerald-500 rounded-full"></div></div>
            </div>
          </div>
          
          {/* Feature 2 */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 space-y-6 hover:border-emerald-500/50 transition flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">Voice & Telemetry Sync</h3>
              <p className="text-gray-400">Low-latency spatial audio rooms synced directly with your game client. Crisp callouts without background static.</p>
            </div>
            <div className="p-4 bg-[#0a0a0a] border border-gray-800 rounded-lg flex justify-between items-center">
              <span className="text-sm text-white font-bold uppercase">Input Latency</span>
              <span className="text-emerald-500 font-bold">12.4 ms</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 space-y-6 hover:border-emerald-500/50 transition flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">Ephemeral Scrim Rooms</h3>
              <p className="text-gray-400">Temporary voice lobbies self-destruct post-match unless unanimous consent converts the lobby into a permanent roster.</p>
            </div>
            <div className="p-4 bg-[#0a0a0a] border border-gray-800 rounded-lg flex items-center gap-3">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-white font-bold uppercase">Match Concluded</span>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

       {/* Lobbies Section */}
       <div className="px-6 md:px-16 py-12 max-w-7xl mx-auto border-t border-gray-800">
            {/* Conditional Content */}
            {!user ? (
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl p-10 md:p-16 text-center space-y-6 relative overflow-hidden">
                    <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
                    <div className="relative z-10">
                        <span className="px-4 py-1.5 rounded-full bg-[#0a0a0a] border border-gray-800 text-emerald-500 text-[10px] uppercase font-extrabold tracking-widest inline-block mb-6">
                            Instant Teammate Matchmaking
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-6">
                            Ready to actually enjoy multiplayer again?
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto mb-8">
                            Join players who refuse to gamble their sanity on solo matchmaking. Lock in with players who share your ambition, vibe, and schedule.
                        </p>
                        <div className="pt-4">
                            <button 
                                onClick={() => navigate("/register")}
                                className="inline-flex items-center gap-2 bg-emerald-500 text-[#0a0a0a] px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-400 transition shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                                Create Free Account
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-12">

                     
                     {/* Popular Games Grid */}
                     <GameGrid />
                </div>
            )}
       </div>

    </div>
  );
}
