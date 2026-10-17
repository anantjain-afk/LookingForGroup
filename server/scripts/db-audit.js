import 'dotenv/config';
import prisma from '../src/db/config.js';

try {
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.info('Tables:', tables.map(row => row.table_name));
  for (const table of ['User', 'Game', 'Lobby', 'LobbyParticipant', '_UserFavoriteGames']) {
    if (tables.some(row => row.table_name === table)) {
      const [row] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${table}"`);
      console.info(`${table}: ${row.count} rows`);
    }
  }
  if (tables.some(row => row.table_name === 'Game')) {
    const [row] = await prisma.$queryRaw`SELECT count(*)::int AS count FROM "Game" WHERE "igdbId" IS NULL`;
    console.info(`Games requiring reviewed IGDB mapping: ${row.count}`);
  }
} finally { await prisma.$disconnect(); }
