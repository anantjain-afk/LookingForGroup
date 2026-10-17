import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import prisma from '../src/db/config.js';
import { catalog, parseIgdbId } from '../src/services/igdb.service.js';
import { resolveGame } from '../src/services/game.service.js';

// Dry-run by default. Names are shown for human review, never used as identity.
const apply = process.argv.includes('--apply');
const mappingIndex = process.argv.indexOf('--map');
try {
  if (mappingIndex !== -1) {
    const mapping = JSON.parse(await readFile(process.argv[mappingIndex + 1], 'utf8'));
    if (!Array.isArray(mapping)) throw new Error('Expected an array of {localId, igdbId} reviewed mappings');
    for (const entry of mapping) {
      const igdbId = parseIgdbId(entry.igdbId);
      const old = await prisma.game.findUniqueOrThrow({ where: { id: entry.localId } });
      const raw = await catalog.getRawById(igdbId);
      if (!raw) throw new Error(`Not an eligible online game: ${igdbId}`);
      if (old.igdbId && old.igdbId !== igdbId) throw new Error(`Refusing to replace an existing different IGDB identity: ${old.id}`);
      console.info({ localId: old.id, oldName: old.name, igdbId, verifiedName: raw.name, apply });
      if (!apply) continue;
      const { local: target } = await resolveGame(igdbId, catalog, true);
      if (target.id === old.id) continue;
      await prisma.$transaction(async tx => {
        await tx.lobby.updateMany({ where: { gameId: old.id }, data: { gameId: target.id } });
        const users = await tx.user.findMany({ where: { favoriteGames: { some: { id: old.id } } }, select: { id: true } });
        for (const user of users) await tx.user.update({ where: { id: user.id }, data: { favoriteGames: { connect: { id: target.id }, disconnect: { id: old.id } } } });
        await tx.game.delete({ where: { id: old.id } });
      });
    }
  }
  for (const game of await prisma.game.findMany({ orderBy: { createdAt: 'asc' } })) {
    if (!game.igdbId) { console.info({ needsMapping: true, localId: game.id, name: game.name }); continue; }
    if (process.argv.includes('--refresh')) {
      if (apply) await resolveGame(game.igdbId, catalog, true);
      else console.info({ igdbId: game.igdbId, eligible: Boolean(await catalog.getRawById(game.igdbId)) });
    }
  }
} finally { await prisma.$disconnect(); }
