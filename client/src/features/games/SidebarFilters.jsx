import { useState } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import { SORT_OPTIONS } from './gameQueries';
function Section({title,children}) {
 const [open,setOpen]=useState(true);
 return <section className="border-b border-gray-800 py-4 last:border-0"><button onClick={()=>setOpen(!open)} aria-expanded={open} className="w-full flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider">{title}<ChevronDown size={14} className={open?'rotate-180':''}/></button>{open&&<div className="mt-3 space-y-1">{children}</div>}</section>;
}
export default function SidebarFilters({filters,onFilterChange,onReset,sortBy,onSortChange,metadata,isSearching}) {
 const toggle=(group,id)=>{const value=String(id);onFilterChange(group,filters[group].includes(value)?filters[group].filter(item=>item!==value):[...filters[group],value]);};
 return <aside className="bg-[#151515] border border-gray-800 rounded-xl p-5 h-fit lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] overflow-y-auto">
  <div className="flex items-center justify-between mb-6"><h2 className="flex items-center gap-2 font-bold text-gray-200"><Filter size={16}/>Filters</h2><button onClick={onReset} className="text-xs text-emerald-400 hover:underline">Reset</button></div>
  <label className="block text-xs text-gray-400 uppercase font-bold">Sort by<select aria-label="Sort games by" className="w-full block mt-2 bg-[#22242a] rounded-lg px-3 py-3 text-sm text-white normal-case font-normal border border-gray-700" value={sortBy} onChange={event=>onSortChange(event.target.value)}>{isSearching&&<option value="relevance">Relevance</option>}{SORT_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
  {['genres','platforms'].map(group=><Section key={group} title={group}>{metadata?.[group]?.map(item=><label key={item.id} className="flex items-center gap-3 px-2 py-2 rounded hover:bg-white/5 cursor-pointer text-sm text-gray-300"><input type="checkbox" className="accent-emerald-500 w-4 h-4" checked={filters[group].includes(String(item.id))} onChange={()=>toggle(group,item.id)}/>{item.name}</label>)}</Section>)}
 </aside>;
}
