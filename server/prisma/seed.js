import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // --- Seed Tags ---
  // Wipe existing tags (must clear LobbyTag first due to FK constraints)
  await prisma.lobbyTag.deleteMany({});
  await prisma.tag.deleteMany({});
  
  const tags = [
    // Communication & Setup
    { name: 'Mic Required', category: 'Communication' },
    { name: 'Mic Optional', category: 'Communication' },
    { name: 'Text Chat Only', category: 'Communication' },
    { name: 'No Background Noises', category: 'Communication' },
    { name: 'Voice Chat (Discord)', category: 'Communication' },

    // Playstyle & Intensity
    { name: 'Chill/Casual', category: 'Vibe' },
    { name: 'TryHard', category: 'Vibe' },
    { name: 'Meme/Troll Friendly', category: 'Vibe' },
    { name: 'Learning', category: 'Vibe' },
    { name: 'Carrying', category: 'Vibe' },
    { name: 'Need Carry', category: 'Vibe' },
    { name: 'Competitive', category: 'Vibe' },
    { name: 'Speedrun', category: 'Vibe' },
    { name: 'Achievement / Trophy Hunting', category: 'Vibe' },

    // Skill Level & Experience
    { name: 'Beginner Friendly', category: 'Skill Level' },
    { name: 'Intermediate', category: 'Skill Level' },
    { name: 'Advanced', category: 'Skill Level' },
    { name: 'Learning Together', category: 'Skill Level' },
    { name: 'No Beginner', category: 'Skill Level' },
    { name: 'Coaching Available', category: 'Skill Level' },

    // Behavior & Attitude
    { name: 'No swearing', category: 'Behavior' },
    { name: 'Swearing allowed', category: 'Behavior' },
    { name: 'No Rage', category: 'Behavior' },
    { name: 'Team-Oriented', category: 'Behavior' },
    { name: 'Solo-Friendly', category: 'Behavior' },

    // Time & Commitment
    { name: 'Short Session', category: 'Commitment' },
    { name: 'Long Session', category: 'Commitment' },
    { name: 'Daily Grind', category: 'Commitment' },
    { name: 'One Match Only', category: 'Commitment' },
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
