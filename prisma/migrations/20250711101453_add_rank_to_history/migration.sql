/*
  Warnings:

  - Added the required column `rank` to the `GameHourlyStats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GameHourlyStats" ADD COLUMN     "rank" INTEGER NOT NULL;
