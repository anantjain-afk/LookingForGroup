import { useQuery, useQueries, useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import SidebarFilters from '../features/games/SidebarFilters';
import GameCard from '../features/games/GameCard';
import { getGamePage, filterQuery, SORT_OPTIONS } from '../features/games/gameQueries';

const sections=[['trending','Popular Online Games'],['shooters','Competitive Shooters'],['rpg','MMOs'],['coop','Online Co-op']];
function Skeletons({row=false}) {return <div className={row?'flex gap-4 overflow-hidden':'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5'}>{Array.from({length:row?5:8},(_,i)=><div key={i} className={`${row?'min-w-[160px] md:min-w-[200px] ':''}aspect-[2/3] rounded-2xl bg-slate-800 animate-pulse`}/>)}</div>;}
function Failure({error,onRetry}) {return <div role="alert" className="border border-red-900/60 bg-red-950/20 rounded-xl p-5 text-sm text-gray-300"><p>{error?.message||'Could not load games.'}</p><button onClick={onRetry} className="text-emerald-400 mt-3 hover:underline">Try again</button></div>;}
export default function BrowseGamesPage() {
 const [params,setParams]=useSearchParams();
 const query=params.get('q')||'';
 const debounced=useDebouncedValue(query.trim());
 const filters={genres:(params.get('genres')||'').split(',').filter(Boolean)};
 const explicitSort=params.get('sort');
 const sortBy=explicitSort==='relevance'&&!query.trim()?'popularity':explicitSort||(query.trim()?'relevance':'popularity');
 const active=filters.genres.length>0;
 const showDiscovery=!query.trim()&&!active&&!explicitSort;
 const waiting=query.trim()!==debounced;
 const metadata=useQuery(filterQuery);
 const update=(key,value)=>setParams(previous=>{const next=new URLSearchParams(previous);if(value?.length)next.set(key,Array.isArray(value)?value.join(','):value);else next.delete(key);return next;},{replace:true});
 const reset=()=>setParams({});
 const discovery=useQueries({queries:sections.map(([category])=>({queryKey:['games','section',category],queryFn:({signal})=>getGamePage({category,limit:12},signal),enabled:showDiscovery,staleTime:5*60_000,retry:1}))});
 const results=useInfiniteQuery({queryKey:['games','catalog',debounced,filters,sortBy],queryFn:({pageParam,signal})=>getGamePage({query:debounced,genres:filters.genres,sortBy,offset:pageParam},signal),initialPageParam:0,getNextPageParam:page=>page.nextOffset??undefined,enabled:!showDiscovery&&!waiting,retry:1});
 const games=results.data?.pages.flatMap(page=>page.games)||[];
 const labels=group=>new Map((metadata.data?.[group]||[]).map(item=>[String(item.id),item.name]));
 return <main className="min-h-screen bg-[#0a0a0a] text-white"><div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
  <header><h1 className="text-3xl font-bold">Browse Games</h1><p className="text-gray-400 text-sm mt-2">{showDiscovery?'Find an online game. Meet your next squad.':`${games.length} games loaded`}</p></header>
  <label className="flex items-center bg-[#151515] border border-gray-800 rounded-full p-2 focus-within:border-emerald-500"><Search className="ml-4 text-gray-400" size={20}/><input aria-label="Search online games" type="search" placeholder="Search online games…" value={query} onChange={event=>update('q',event.target.value)} className="w-full bg-transparent px-4 py-3 focus:outline-none text-white placeholder:text-gray-500" maxLength={100}/></label>
  <div className="flex flex-col lg:flex-row gap-8"><div className="flex-1 min-w-0 space-y-6">
   {active&&<div className="flex flex-wrap gap-2">{filters.genres.map(id=><button key={`genres-${id}`} className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300" onClick={()=>update('genres',filters.genres.filter(value=>value!==id))}>{labels('genres').get(id)||id}<X size={12}/></button>)}</div>}
   {showDiscovery?<div className="space-y-12">{sections.map(([category,title],index)=>{const result=discovery[index];return <section key={category} className="space-y-4"><h2 className="text-2xl font-bold">{title}</h2>{result.isPending?<Skeletons row/>:result.isError?<Failure error={result.error} onRetry={()=>result.refetch()}/>:result.data?.games.length?<div className="flex gap-4 overflow-x-auto pb-4">{result.data.games.map(game=><div key={game.igdbId} className="w-[160px] md:w-[200px] shrink-0"><GameCard game={game}/></div>)}</div>:<p className="text-sm text-gray-400">No games are available in this section yet.</p>}</section>;})}</div>:<>
    <p className="text-xs text-gray-500">{sortBy==='popularity'?'Popularity reflects IGDB rating activity.':sortBy==='rating'?'Ratings include games with at least 10 ratings.':SORT_OPTIONS.find(option=>option.value===sortBy)?.label||'Sorted by search relevance'}</p>
    {waiting||results.isPending?<Skeletons/>:results.isError&&!games.length?<Failure error={results.error} onRetry={()=>results.refetch()}/>:games.length?<><div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">{games.map(game=><GameCard key={game.igdbId} game={game}/>)}</div>{results.isFetchNextPageError&&<Failure error={results.error} onRetry={()=>results.fetchNextPage()}/>} {results.hasNextPage&&<button disabled={results.isFetchingNextPage} onClick={()=>results.fetchNextPage()} className="block mx-auto bg-[#151515] border border-emerald-500/40 hover:bg-emerald-500/10 px-6 py-3 rounded-full text-emerald-300 font-semibold disabled:opacity-50">{results.isFetchingNextPage?'Loading games…':'Load more games'}</button>}</>:<div className="border border-dashed border-gray-700 rounded-2xl text-center py-16"><h2 className="font-bold text-xl">No matching online games</h2><p className="text-gray-400 mt-2">Try another name or adjust your filters.</p><button onClick={reset} className="text-emerald-400 mt-5">Clear search and filters</button></div>}
   </>}
  </div><div className="w-full lg:w-[280px] shrink-0">{metadata.isError?<Failure error={metadata.error} onRetry={()=>metadata.refetch()}/>:<SidebarFilters filters={filters} onFilterChange={update} onReset={reset} sortBy={sortBy} onSortChange={value=>update('sort',value)} metadata={metadata.data} isSearching={Boolean(query.trim())}/>}</div></div>
 </div></main>;
}
