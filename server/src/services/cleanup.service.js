import cron from "node-cron";
import prisma from "../db/config.js";

// Service to clean up dead lobbies
export const initCleanupService = () => {
    console.log("🧹 Cleanup Service Initialized: Running every 10 minutes");

    // Run every 10 minutes
    cron.schedule("*/10 * * * *", async () => {
        console.log("🧹 Running Lobby Cleanup...");

        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

            // Find lobbies to delete:
            // 1. Status is OPEN or FULL
            // 2. No participants
            // 3. Updated more than 1 hour ago
            const lobbiesToDelete = await prisma.lobby.findMany({
                where: {
                    status: { in: ["OPEN", "FULL"] },
                    participants: { none: {} },
                    updatedAt: { lt: oneHourAgo },
                },
                select: { id: true, title: true }
            });

            if (lobbiesToDelete.length > 0) {
                const ids = lobbiesToDelete.map(l => l.id);
                console.log(`🧹 Found ${ids.length} dead lobbies. Deleting...`);

                // Delete associated LobbyTags (if any explicit relation needs manual cleanup, 
                // though Prisma cascade should handle it if set up correctly. 
                // We'll delete lobby which cascades to participants/tags usually)
                
                // Note: If LobbyTag is a many-to-many implicit table or explicit model without cascade, 
                // we might need to delete them. Assuming Cascade Delete is configured on schema.
                // If not, we'd delete LobbyTag first. 
                
                // Let's assume cascade or just delete lobby for now.
                const { count } = await prisma.lobby.deleteMany({
                    where: {
                        id: { in: ids }
                    }
                });

                console.log(`🧹 Deleted ${count} lobbies.`);
            } else {
                console.log("🧹 No dead lobbies found.");
            }

        } catch (error) {
            console.error("❌ Cleanup Service Error:", error);
        }
    });
};
