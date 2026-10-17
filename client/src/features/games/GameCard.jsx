import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Heart, Gamepad2 } from 'lucide-react';
import { apiPost, apiDelete } from '../../api/client';
import { useUserStore } from '../../store/useUserStore';
import { useToast } from '../../hooks/useToast';
export default function GameCard({game}) {
 const {user,updateUser}=useUserStore();
 const [busy,setBusy]=useState(false);
 const client=useQueryClient();const navigate=useNavigate();const location=useLocation();const {toast}=useToast();
 const favorite=user?.favoriteGames?.some(item=>item.igdbId===game.igdbId);
 async function toggleFavorite() {
  if(!user) return navigate(`/login?returnTo=${encodeURIComponent(location.pathname+location.search)}`);
  if(busy)return;setBusy(true);
  try {
   const games=await (favorite?apiDelete:apiPost)(`/api/me/favorites/${game.igdbId}`);
   updateUser({favoriteGames:games});
   client.setQueryData(['auth','me'],old=>old?{...old,favoriteGames:games}:old);
   toast({title:favorite?'Removed from favorites':'Added to your favorites',description:game.name});
  }catch(error){toast({title:'Could not update favorites',description:error.message,variant:'destructive'});}finally{setBusy(false);}
 }
 return <article className="group relative bg-[#151515] rounded-2xl overflow-hidden border border-gray-800 hover:border-emerald-500/60 transition-colors">
  <Link to={`/game/${game.igdbId}`} className="block relative aspect-[2/3] focus-visible:outline-2 focus-visible:outline-emerald-400 focus-visible:outline-offset-[-3px]">
   <img src={game.cover||'https://placehold.co/300x450/151515/64748b?text=Online+Game'} alt={game.name} className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" loading="lazy" />
   <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-4 pt-12"><div className="inline-flex items-center gap-1 text-[10px] text-emerald-300 mb-2 uppercase tracking-wide"><Gamepad2 size={12}/>Online multiplayer</div><h3 className="text-white font-bold leading-snug text-sm">{game.name}</h3><p className="text-gray-400 text-xs mt-1 truncate">{game.genres?.[0]||'Find your next squad'}</p><span className="inline-block text-emerald-400 text-xs font-semibold mt-3 group-hover:underline">Find lobbies →</span></div>
  </Link>
  <button disabled={busy} onClick={toggleFavorite} aria-label={`${favorite?'Remove':'Add'} ${game.name} ${favorite?'from':'to'} favorites`} aria-pressed={Boolean(favorite)} className={`absolute top-3 right-3 p-2 rounded-full bg-black/70 border border-white/10 hover:border-emerald-400 disabled:opacity-50 transition-colors ${favorite?'text-emerald-400':'text-gray-200'}`}><Heart size={16} className={favorite?'fill-current squad-pop':''}/></button>
 </article>;
}
