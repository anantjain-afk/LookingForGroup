// Reviewed collections express editorial meaning; a Shooter genre alone does
// not establish that a game is a competitive shooter.
export const COLLECTIONS = {
  shooters: [126459, 242408, 114795], // Valorant, Counter-Strike 2, Apex Legends
  rpg: [123, 386, 1183], // World of Warcraft, FFXIV (current), Guild Wars 2
};
export const REVIEWS = {
  126459: { allowPlatforms: [6, 167, 169], reason: 'Valorant supports PC, PS5 and Xbox Series consoles; online platform metadata is incomplete.', source: 'https://playvalorant.com/en-gb/news/game-updates/about-valorant-console-availability/' },
  114795: { allowPlatforms: [6, 48, 49, 167, 169, 508], denyPlatforms: [130], reason: 'Current Apex platforms; original Switch support ended August 4, 2026.', source: 'https://forums.ea.com/blog/apex-legends-game-info-hub-en/an-update-on-nintendo-switch-support/13153694' },
  134710: { allowPlatforms: [6, 48, 49, 167, 169], reason: 'Standalone GTA Online entry lacks detailed multiplayer metadata.', source: 'https://www.rockstargames.com/gta-online' },
  1020: { denyPlatforms: [9, 12], reason: 'PS3 and Xbox 360 online services ended in 2021.', source: 'https://support.rockstargames.com/articles/7dADpZ41gSg4Ma8LHO6dF3/end-of-online-services-for-playstation-3-and-xbox-360-versions-of-grand-theft-auto-v-max-payne-3-and-l-a-noire-faq' },
  565: { denied: true, reason: 'Uncharted 2 PS3 multiplayer services ended in 2019.', source: 'https://www.naughtydog.com/blog/uncharted_the_last_of_us_multiplayer_ps3_offline_september_3_2019' },
  14729: { denied: true, reason: 'Original FFXIV service was replaced by A Realm Reborn (386).', source: 'https://na.finalfantasyxiv.com/a_realm_reborn/' },
  123: { allowPlatforms: [6, 14], reason: 'Current supported WoW platforms.', source: 'https://worldofwarcraft.blizzard.com/en-us/start' },
  386: { allowPlatforms: [6, 14, 48, 167, 169], reason: 'Current FFXIV platforms; excludes retired PS3 support and unverified future ports.', source: 'https://na.finalfantasyxiv.com/system_requirements/' },
  1183: { allowPlatforms: [6], reason: 'Current Guild Wars 2 client platform.', source: 'https://www.guildwars2.com/en/download/' },
  119133: { allowPlatforms: [6, 48, 49, 167, 169], reason: 'Online co-op metadata does not specify its platforms.', source: 'https://en.bandainamcoent.eu/elden-ring/elden-ring' },
};
export const PLATFORMS = [
  { id: 6, name: 'PC' }, { id: 14, name: 'Mac' }, { id: 3, name: 'Linux' },
  { id: 167, name: 'PlayStation 5' }, { id: 48, name: 'PlayStation 4' },
  { id: 169, name: 'Xbox Series X|S' }, { id: 49, name: 'Xbox One' },
  { id: 130, name: 'Nintendo Switch' }, { id: 508, name: 'Nintendo Switch 2' },
  { id: 34, name: 'Android' }, { id: 39, name: 'iOS' },
];
export const GENRES = [
  { id: 5, name: 'Shooter' }, { id: 12, name: 'RPG' }, { id: 15, name: 'Strategy' },
  { id: 31, name: 'Adventure' }, { id: 36, name: 'MOBA' }, { id: 10, name: 'Racing' },
  { id: 14, name: 'Sport' }, { id: 4, name: 'Fighting' }, { id: 13, name: 'Simulator' }, { id: 9, name: 'Puzzle' },
];
export const ONLINE_EVIDENCE = '(multiplayer_modes.onlinemax > 1 | multiplayer_modes.onlinecoop = true | multiplayer_modes.onlinecoopmax > 1 | multiplayer_modes.splitscreenonline = true | game_modes = (5))';
export const EXCLUDED_TYPES = [1, 2, 3, 6, 7, 13, 14];
export function supportedOnlinePlatforms(game) {
  const review = REVIEWS[game.id];
  if (review?.denied) return [];
  const ids = new Set(review?.allowPlatforms || []);
  for (const mode of game.multiplayer_modes || []) {
    if (mode.onlinemax > 1 || mode.onlinecoop === true || mode.onlinecoopmax > 1 || mode.splitscreenonline === true) {
      if (mode.platform) ids.add(typeof mode.platform === 'object' ? mode.platform.id : mode.platform);
      else if (game.platforms?.length === 1) ids.add(game.platforms[0].id);
    }
  }
  if (game.game_modes?.some(mode => (mode.id || mode) === 5) && game.platforms?.length === 1) ids.add(game.platforms[0].id);
  return [...ids].filter(id => !review?.denyPlatforms?.includes(id) && (!review?.allowPlatforms || review.allowPlatforms.includes(id))).map(id => ({ id, name: PLATFORMS.find(p => p.id === id)?.name || game.platforms?.find(p => p.id === id)?.name || `Platform ${id}` }));
}
export function isEligible(game, platformIds = []) {
  if (!game || REVIEWS[game.id]?.denied || game.version_parent || EXCLUDED_TYPES.includes(game.game_type)) return false;
  if (!game.first_release_date || game.first_release_date > Date.now() / 1000) return false;
  const modes = game.multiplayer_modes || [];
  const online = Boolean(REVIEWS[game.id]?.allowPlatforms?.length) || modes.some(m => m.onlinemax > 1 || m.onlinecoop === true || m.onlinecoopmax > 1 || m.splitscreenonline === true) || game.game_modes?.some(m => (m.id || m) === 5);
  if (!online) return false;
  const supported = supportedOnlinePlatforms(game);
  // Known shutdowns must not leave a game eligible through a retired platform.
  if (REVIEWS[game.id]?.denyPlatforms && !supported.length) return false;
  return !platformIds.length || supported.some(p => platformIds.includes(p.id));
}
