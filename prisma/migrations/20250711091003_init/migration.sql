/*
  Warnings:

  - The primary key for the `Game` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `currentPlayers` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `isFree` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdated` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `releaseDate` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `steamAppid` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the `Developer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GameGenre` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlayerStat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Publisher` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DeveloperToGame` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_GameToGameGenre` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_GameToPublisher` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `rank_steam` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `steamName` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `steam_shop_url` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `twitchGameId` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `twitchName` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `twitch_box_art_url` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PlayerStat" DROP CONSTRAINT "PlayerStat_steamAppid_fkey";

-- DropForeignKey
ALTER TABLE "_DeveloperToGame" DROP CONSTRAINT "_DeveloperToGame_A_fkey";

-- DropForeignKey
ALTER TABLE "_DeveloperToGame" DROP CONSTRAINT "_DeveloperToGame_B_fkey";

-- DropForeignKey
ALTER TABLE "_GameToGameGenre" DROP CONSTRAINT "_GameToGameGenre_A_fkey";

-- DropForeignKey
ALTER TABLE "_GameToGameGenre" DROP CONSTRAINT "_GameToGameGenre_B_fkey";

-- DropForeignKey
ALTER TABLE "_GameToPublisher" DROP CONSTRAINT "_GameToPublisher_A_fkey";

-- DropForeignKey
ALTER TABLE "_GameToPublisher" DROP CONSTRAINT "_GameToPublisher_B_fkey";

-- DropIndex
DROP INDEX "Game_currentPlayers_idx";

-- DropIndex
DROP INDEX "Game_name_idx";

-- AlterTable
ALTER TABLE "Game" DROP CONSTRAINT "Game_pkey",
DROP COLUMN "currentPlayers",
DROP COLUMN "isFree",
DROP COLUMN "lastUpdated",
DROP COLUMN "name",
DROP COLUMN "releaseDate",
DROP COLUMN "steamAppid",
DROP COLUMN "type",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "rank_steam" INTEGER NOT NULL,
ADD COLUMN     "steamName" TEXT NOT NULL,
ADD COLUMN     "steam_shop_url" TEXT NOT NULL,
ADD COLUMN     "twitchGameId" INTEGER NOT NULL,
ADD COLUMN     "twitchName" TEXT NOT NULL,
ADD COLUMN     "twitch_box_art_url" TEXT NOT NULL,
ADD CONSTRAINT "Game_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "Developer";

-- DropTable
DROP TABLE "GameGenre";

-- DropTable
DROP TABLE "PlayerStat";

-- DropTable
DROP TABLE "Publisher";

-- DropTable
DROP TABLE "_DeveloperToGame";

-- DropTable
DROP TABLE "_GameToGameGenre";

-- DropTable
DROP TABLE "_GameToPublisher";

-- CreateTable
CREATE TABLE "GameHourlyStats" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPlayers" INTEGER NOT NULL,
    "peakToday" INTEGER NOT NULL,

    CONSTRAINT "GameHourlyStats_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GameHourlyStats" ADD CONSTRAINT "GameHourlyStats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
