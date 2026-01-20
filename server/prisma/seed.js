import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // --- Seed Games ---
  const games = [
    { name: 'Valorant', genre: 'Tactical Shooter', imageUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2av4.jpg' },
    { name: 'Apex Legends', genre: 'Battle Royale', imageUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co25gl.jpg' },
    { name: 'Counter-Strike 2', genre: 'Tactical Shooter', imageUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co6y0k.jpg' },
    { name: 'League of Legends', genre: 'MOBA', imageUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2cv2.jpg' },
    { name: 'Overwatch 2', genre: 'Hero Shooter', imageUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5s5v.jpg' },
  ];

  for (const g of games) {
    await prisma.game.upsert({
      where: { name: g.name },
      update: {},
      create: g,
    });
  }

  // --- Seed Tags ---
  const tags = [
    // Vibe
    { name: 'Chill', category: 'Vibe' },
    { name: 'No Toxic', category: 'Vibe' },
    { name: 'Serious', category: 'Vibe' },
    { name: 'Friendly', category: 'Vibe' },
    
    // Mode
    { name: 'Ranked', category: 'Mode' },
    { name: 'Unrated', category: 'Mode' },
    { name: 'Custom', category: 'Mode' },
    { name: 'Tournament', category: 'Mode' },

    // Requirements
    { name: 'Mic On', category: 'Requirement' },
    { name: '18+', category: 'Requirement' },
    { name: 'Newbies Welcome', category: 'Requirement' },
    { name: 'Veterans Only', category: 'Requirement' },
  ];

  for (const t of tags) {
    await prisma.tag.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
