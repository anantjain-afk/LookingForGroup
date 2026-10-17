-- AlterTable
ALTER TABLE "Lobby" ADD COLUMN     "language" TEXT,
ADD COLUMN     "platformId" INTEGER,
ADD COLUMN     "region" TEXT;

-- AlterTable
ALTER TABLE "LobbyParticipant" ADD COLUMN     "disconnectedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "LobbyBan" (
    "lobbyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LobbyBan_pkey" PRIMARY KEY ("lobbyId","userId")
);

-- CreateIndex
CREATE INDEX "Lobby_gameId_status_idx" ON "Lobby"("gameId", "status");

-- CreateIndex
CREATE INDEX "LobbyParticipant_disconnectedAt_idx" ON "LobbyParticipant"("disconnectedAt");

-- AddForeignKey
ALTER TABLE "LobbyBan" ADD CONSTRAINT "LobbyBan_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyBan" ADD CONSTRAINT "LobbyBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

