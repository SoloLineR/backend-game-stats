-- CreateTable
CREATE TABLE "Game" (
    "steamAppid" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "releaseDate" TIMESTAMP(3),
    "isFree" BOOLEAN,
    "currentPlayers" INTEGER,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("steamAppid")
);

-- CreateTable
CREATE TABLE "GameGenre" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GameGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Developer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publisher" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStat" (
    "id" SERIAL NOT NULL,
    "steamAppid" INTEGER NOT NULL,
    "players" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GameToGameGenre" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_GameToGameGenre_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_GameToPublisher" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_GameToPublisher_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DeveloperToGame" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_DeveloperToGame_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Game_name_idx" ON "Game"("name");

-- CreateIndex
CREATE INDEX "Game_currentPlayers_idx" ON "Game"("currentPlayers");

-- CreateIndex
CREATE UNIQUE INDEX "GameGenre_name_key" ON "GameGenre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Developer_name_key" ON "Developer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_name_key" ON "Publisher"("name");

-- CreateIndex
CREATE INDEX "PlayerStat_steamAppid_idx" ON "PlayerStat"("steamAppid");

-- CreateIndex
CREATE INDEX "PlayerStat_timestamp_idx" ON "PlayerStat"("timestamp");

-- CreateIndex
CREATE INDEX "_GameToGameGenre_B_index" ON "_GameToGameGenre"("B");

-- CreateIndex
CREATE INDEX "_GameToPublisher_B_index" ON "_GameToPublisher"("B");

-- CreateIndex
CREATE INDEX "_DeveloperToGame_B_index" ON "_DeveloperToGame"("B");

-- AddForeignKey
ALTER TABLE "PlayerStat" ADD CONSTRAINT "PlayerStat_steamAppid_fkey" FOREIGN KEY ("steamAppid") REFERENCES "Game"("steamAppid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameToGameGenre" ADD CONSTRAINT "_GameToGameGenre_A_fkey" FOREIGN KEY ("A") REFERENCES "Game"("steamAppid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameToGameGenre" ADD CONSTRAINT "_GameToGameGenre_B_fkey" FOREIGN KEY ("B") REFERENCES "GameGenre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameToPublisher" ADD CONSTRAINT "_GameToPublisher_A_fkey" FOREIGN KEY ("A") REFERENCES "Game"("steamAppid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GameToPublisher" ADD CONSTRAINT "_GameToPublisher_B_fkey" FOREIGN KEY ("B") REFERENCES "Publisher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DeveloperToGame" ADD CONSTRAINT "_DeveloperToGame_A_fkey" FOREIGN KEY ("A") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DeveloperToGame" ADD CONSTRAINT "_DeveloperToGame_B_fkey" FOREIGN KEY ("B") REFERENCES "Game"("steamAppid") ON DELETE CASCADE ON UPDATE CASCADE;
