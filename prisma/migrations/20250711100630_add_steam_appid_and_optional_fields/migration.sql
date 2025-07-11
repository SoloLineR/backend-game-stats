/*
  Warnings:

  - A unique constraint covering the columns `[steamAppId]` on the table `Game` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[steamName]` on the table `Game` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "steamAppId" INTEGER,
ALTER COLUMN "rank_steam" DROP NOT NULL,
ALTER COLUMN "steam_shop_url" DROP NOT NULL,
ALTER COLUMN "twitchGameId" DROP NOT NULL,
ALTER COLUMN "twitchName" DROP NOT NULL,
ALTER COLUMN "twitch_box_art_url" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Game_steamAppId_key" ON "Game"("steamAppId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_steamName_key" ON "Game"("steamName");
