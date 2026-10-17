import cron from "node-cron";
import prisma from "../db/config.js";
import { RECONNECT_GRACE_MS } from "../config/lobbies.js";
export function initCleanupService(realtime) {
  return cron.schedule("*/30 * * * * *", async () => {
    try {
      const expired = await prisma.lobbyParticipant.findMany({
        where: {
          disconnectedAt: { lt: new Date(Date.now() - RECONNECT_GRACE_MS) },
        },
        select: { lobbyId: true, userId: true },
      });
      for (const p of expired) await realtime.expire(p.lobbyId, p.userId);
      await prisma.$transaction(async (tx) => {
        const rows = await tx.lobby.findMany({
          where: {
            status: "CLOSED",
            updatedAt: { lt: new Date(Date.now() - 86400_000) },
          },
          select: { id: true },
        });
        const ids = rows.map((row) => row.id);
        if (ids.length) {
          await tx.lobbyTag.deleteMany({ where: { lobbyId: { in: ids } } });
          await tx.lobbyParticipant.deleteMany({
            where: { lobbyId: { in: ids } },
          });
          await tx.lobby.deleteMany({ where: { id: { in: ids } } });
        }
        await tx.session.deleteMany({
          where: { expiresAt: { lt: new Date() } },
        });
        await tx.emailToken.deleteMany({
          where: { expiresAt: { lt: new Date() } },
        });
      });
    } catch {
      console.error(JSON.stringify({ event: "cleanup_failed" }));
    }
  });
}
