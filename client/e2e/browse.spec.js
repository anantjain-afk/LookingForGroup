import { test, expect } from '@playwright/test';
const cover=(name,color)=>`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect fill="${color}" width="300" height="450"/><text x="20" y="80" fill="white" font-family="sans-serif" font-size="22">${name}</text></svg>`)}`;
const games=[{igdbId:126459,name:'Valorant',cover:cover('VALORANT','#75333f'),genres:['Shooter'],platforms:['PC']},{igdbId:242408,name:'Counter-Strike 2',cover:cover('COUNTER-STRIKE','#786039'),genres:['Shooter'],platforms:['PC']},{igdbId:146903,name:'Battlegrounds Mobile India',cover:cover('BGMI','#294548'),genres:['Shooter'],platforms:['Android']}];
async function setup(page,{fail=false}={}) {
 page.on('pageerror',error=>console.error('Browser error:',error.message));
 let failing=fail;
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());let body;
  if(!url.pathname.startsWith('/api/'))return route.continue();
  if(url.pathname==='/api/me')return route.fulfill({status:401,json:{error:{message:'Sign in'}}});
  if(url.pathname==='/api/auth/config')body={googleClientId:''};
  else if(url.pathname==='/api/games/filters')body={genres:[{id:5,name:'Shooter'},{id:12,name:'RPG'}]};
  else if(url.pathname==='/api/games') {
   if(failing&&!url.searchParams.has('category'))return route.fulfill({status:503,json:{error:{message:'Game discovery is temporarily unavailable. Please retry.'}}});
   let list=[...games];
   if(url.searchParams.get('query'))list=list.filter(g=>g.name.toLowerCase().includes(url.searchParams.get('query').toLowerCase()));
   if(url.searchParams.get('genres')==='5')list=list.filter(g=>g.genres.includes('Shooter'));
   if(url.searchParams.get('sortBy')==='name_asc')list.sort((a,b)=>a.name.localeCompare(b.name));
   body={games:list,nextOffset:null};
  }else if(/^\/api\/games\/\d+$/.test(url.pathname))body=games.find(g=>g.igdbId===Number(url.pathname.split('/').at(-1)));
  else if(url.pathname.endsWith('/lobbies')||url.pathname==='/api/tags')body=[];
  else return route.fulfill({status:404,json:{error:{message:'Unknown test route'}}});
  return route.fulfill({json:body});
 });
 return { recover:()=>{failing=false;} };
}
test('discovery retains layout and removes unsupported controls',async({page},info)=>{
 await setup(page);await page.goto('/browse');
 await expect(page.getByRole('heading',{name:'Competitive Shooters'})).toBeVisible();
 await expect(page.getByText('Grid View')).toHaveCount(0);
 await expect(page.getByRole('option',{name:'Price: Low to High'})).toHaveCount(0);
 await expect(page.getByText('Free',{exact:true})).toHaveCount(0);
 await page.screenshot({path:info.outputPath('browse-desktop.png'),fullPage:true});
});
test('sort works without search; text and genre filters preserve URL and IGDB links',async({page})=>{
 await setup(page);await page.goto('/browse');
 await page.getByLabel('Sort games by').selectOption('name_asc');
 await expect(page).toHaveURL(/sort=name_asc/);
 await expect(page.getByRole('heading',{name:'Competitive Shooters'})).toHaveCount(0);
 await expect(page.locator('article').first()).toContainText('Battlegrounds Mobile India');
 await page.getByRole('searchbox',{name:'Search online games'}).fill('Battlegrounds');
 await page.getByLabel('Shooter',{exact:true}).click();
 await expect(page.getByLabel('Shooter',{exact:true})).toBeChecked();
 await expect(page).toHaveURL(/genres=5/);
 await expect(page.locator('article')).toHaveCount(1);
 await page.locator('a[href="/game/146903"]').click();await expect(page).toHaveURL(/\/game\/146903$/);
});
test('upstream failure offers a retry and mobile browse fits the viewport',async({page},info)=>{
 const api=await setup(page,{fail:true});await page.setViewportSize({width:390,height:844});await page.goto('/browse?sort=name_asc');
 await expect(page.getByRole('alert')).toContainText('Game discovery');
 api.recover();await page.getByRole('button',{name:'Try again'}).click();await expect(page.locator('article')).toHaveCount(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
 await page.screenshot({path:info.outputPath('browse-mobile.png'),fullPage:true});
});
