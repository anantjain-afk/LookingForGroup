import { apiGet } from '../../api/client';
export async function getGamePage(params = {}, signal) {
 const query=new URLSearchParams();
 for(const [key,value] of Object.entries(params)) {
  if(value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) continue;
  query.set(key,Array.isArray(value)?value.join(','):String(value));
 }
 return apiGet(`/api/games?${query}`,{signal});
}
export const filterQuery = { queryKey:['game-filters'],queryFn:()=>apiGet('/api/games/filters'),staleTime:Infinity };
export const SORT_OPTIONS=[{value:'popularity',label:'Popularity'},{value:'newest',label:'Newest released'},{value:'rating',label:'Highest rated'},{value:'name_asc',label:'Name: A–Z'}];
