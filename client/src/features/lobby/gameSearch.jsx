import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '../../components/ui/input';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getGamePage } from '../games/gameQueries';
export default function GameSearch({onSelect}) {
 const [search,setSearch]=useState('');const [selected,setSelected]=useState(null);
 const query=useDebouncedValue(search.trim());
 const results=useQuery({queryKey:['games','picker',query],queryFn:({signal})=>getGamePage({query,limit:10},signal),enabled:query.length>=2&&!selected,retry:1});
 const games=results.data?.games||[];
 return <div className="space-y-2"><Input aria-label="Choose an online game" placeholder="Choose an online game…" value={search} maxLength={100} onChange={event=>{setSearch(event.target.value);setSelected(null);onSelect?.(null);}} className="bg-[#424549] border-[#7289da] text-white"/>
  {!selected&&query.length>=2&&<div className="rounded-lg bg-[#282b30] border border-gray-700 p-2 max-h-72 overflow-y-auto">{results.isFetching?<p className="p-3 text-sm text-gray-400">Searching online games…</p>:results.isError?<div role="alert" className="p-3 text-red-300 text-sm">{results.error.message}<button onClick={()=>results.refetch()} className="block underline mt-2">Retry</button></div>:games.length?games.map(game=><button key={game.igdbId} onClick={()=>{setSelected(game);setSearch(game.name);onSelect?.(game);}} className="w-full flex items-center gap-3 p-2 text-left rounded hover:bg-[#35373c]"><img alt="" src={game.cover||'https://placehold.co/40x60?text=Game'} className="w-8 h-12 rounded object-cover"/><span>{game.name}</span></button>):<p className="text-sm text-gray-400 p-3">No supported online games found.</p>}</div>}
 </div>;
}
