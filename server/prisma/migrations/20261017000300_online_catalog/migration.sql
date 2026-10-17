-- DropIndex
DROP INDEX "Game_name_key";

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "syncedAt" TIMESTAMP(3);

