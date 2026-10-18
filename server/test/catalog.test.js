import test from 'node:test';
import assert from 'node:assert/strict';
import { isEligible, supportedOnlinePlatforms } from '../src/config/game-catalog.js';
import { GameCatalog, parseIgdbId } from '../src/services/igdb.service.js';
import { resolveGame } from '../src/services/game.service.js';
import { start, browser, clearDatabase, prisma } from './helpers.js';

const game = (id, extra = {}) => ({ id, name:`Game ${id}`, game_type:0, first_release_date:1600000000, platforms:[{id:6,name:'PC'}], genres:[{id:5,name:'Shooter'}], multiplayer_modes:[{platform:6,onlinemax:4}], ...extra });
function fixtures(rows) {
 const queries=[];
 return { queries, request: async (_endpoint,query) => {
  queries.push(query);
  const match = query.match(/where id = (\d+);/);
  if (match) return rows.filter(row => row.id === Number(match[1]));
  const offset=Number(query.match(/offset (\d+);/)?.[1] || 0);
  return rows.slice(offset,offset+50);
 } };
}

test('online evidence excludes local co-op and unavailable services, including platform-specific shutdowns', () => {
 assert.equal(isEligible(game(1,{multiplayer_modes:[],game_modes:[{id:3}]})),false);
 assert.equal(isEligible(game(146903,{game_type:11,platforms:[{id:34,name:'Android'}],multiplayer_modes:[{platform:34,onlinecoop:true,onlinecoopmax:4}]})),true);
 assert.equal(isEligible(game(565)),false);
 assert.equal(isEligible(game(134710,{multiplayer_modes:[]})),true);
 assert.equal(isEligible(game(1,{multiplayer_modes:[{platform:6,onlinemax:4},{platform:167,offlinecoop:true}] }),[167]),false);
 assert.equal(isEligible(game(1020,{multiplayer_modes:[{platform:9,onlinemax:30}]})),false);
 assert.equal(supportedOnlinePlatforms(game(1020,{multiplayer_modes:[{platform:6,onlinecoop:true},{platform:9,onlinemax:30}]})).some(p=>p.id===9),false);
 assert.equal(isEligible(game(1,{first_release_date:Math.floor(Date.now()/1000)+86400})),false);
 assert.equal(isEligible(game(1,{game_type:3})),false);
 for(const id of ['123abc','0','-1','1; fields *;','2147483648']) assert.throws(()=>parseIgdbId(id));
});

test('discovery is paginated, curated, safely escaped, cached, and does not create database rows', async () => {
 const transport=fixtures([game(1020),game(126459),game(242408),game(146903,{game_type:11})]);
 const catalog=new GameCatalog(transport);
 const shooters=await catalog.list({category:'shooters'});
 assert.deepEqual(shooters.games.map(g=>g.igdbId),[126459,242408]);
 assert.equal(shooters.games[0].id,undefined);
 await assert.rejects(()=>catalog.list({genres:'5); fields *;'}),{status:400});
 await catalog.list({query:'a"; where id=1;',sortBy:'name_asc'});
 assert.match(transport.queries.at(-1),/name ~ \*"a\\"; where id=1;"\*/);
 const transport2=fixtures(Array.from({length:35},(_,i)=>game(i+500)));
 const paged=new GameCatalog(transport2);
 const page=await paged.list({limit:30});assert.equal(page.games.length,30);assert.equal(page.nextOffset,30);
 const last=await paged.list({offset:page.nextOffset});assert.equal(last.games.length,5);assert.equal(last.nextOffset,null);
 const calls=transport2.queries.length;
 await Promise.all([paged.getById(500),paged.getById(500)]);
 assert.equal(transport2.queries.length,calls+1);
});

test('short searches recover literal game-name matches missing from IGDB relevance results', async () => {
 const queries=[];
 const dungeonsOnline=game(5629,{name:'Dungeons & Dragons Online',platforms:[],multiplayer_modes:[{onlinecoop:true}]});
 const transport={queries,request:async(_endpoint,query)=>{
  queries.push(query);
  if(query.includes('search "dungeons"')) return [game(26606,{name:'Dungeon Fighter Online'}),game(203870,{name:'AI Dungeon'})];
  if(query.includes('where name ~ *"dungeons"*')) return [dungeonsOnline];
  return [];
 }};
 const catalog=new GameCatalog(transport);
 const result=await catalog.list({query:'dungeons',limit:10});
 assert.deepEqual(result.games.map(item=>item.name),['Dungeons & Dragons Online','Dungeon Fighter Online','AI Dungeon']);
 assert.match(queries[0],/search "dungeons";/);
 assert.match(queries[1],/where name ~ \*"dungeons"\*;/);
});

test('lazy IGDB upserts preserve relationships and allow distinct games with duplicate names', async () => {
 await clearDatabase();
 const provider=new GameCatalog(fixtures([game(126459,{name:'Same title'}),game(777,{name:'Same title'}),game(999,{multiplayer_modes:[]})]));
 const runtime=await start({catalog:provider,sendMail:async()=>{}});
 try {
 const client=browser(runtime.base);
 assert.equal((await client.call('/api/games')).status,200);
 assert.equal(await prisma.game.count(),0);
 const register=await client.call('/api/auth/register',{method:'POST',body:{email:'catalog@example.com',username:'CatalogPlayer',password:'correct horse battery'}});
 await prisma.user.update({where:{id:register.body.user.id},data:{emailVerifiedAt:new Date()}});
 await Promise.all(Array.from({length:10},()=>resolveGame(126459,provider,true)));
 assert.equal(await prisma.game.count(),1);
 assert.equal((await client.call('/api/me/favorites/126459',{method:'POST'})).status,200);
 const lobby=await client.call('/api/lobbies',{method:'POST',body:{igdbId:126459,title:'First online lobby',region:'Asia',maxPlayers:5,tags:[]}});
 assert.equal(lobby.status,201); assert.equal(lobby.body.game.igdbId,126459);
 const local=await prisma.game.findUnique({where:{igdbId:126459}});
 assert.equal((await prisma.lobby.findUnique({where:{id:lobby.body.id}})).gameId,local.id);
 const lobbies=await client.call('/api/games/126459/lobbies'); assert.equal(lobbies.body.length,1);assert.equal('credentials' in lobbies.body[0],false);
 await resolveGame(777,provider,true);assert.equal(await prisma.game.count(),2);
 const me=await client.call('/api/me');assert.equal(me.body.favoriteGames[0].igdbId,126459);
 assert.equal((await client.call('/api/me/favorites/999',{method:'POST'})).status,404);
 assert.equal((await client.call('/api/me/favorites/not-a-number',{method:'POST'})).status,400);
 } finally {await runtime.close();await prisma.$disconnect();}
});
