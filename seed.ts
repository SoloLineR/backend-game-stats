import { PrismaClient } from './generated/prisma';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

type SteamApp = {
  appid?: number; // Делаем поля необязательными
  name?: string;
};

async function seedGames() {
  try {
    const gamesPath = path.join(
      __dirname,
      '../backend-game-stats/steam_apps.json',
    );

    if (!fs.existsSync(gamesPath)) {
      throw new Error(`Файл не найден: ${gamesPath}`);
    }

    const gamesData = fs.readFileSync(gamesPath, 'utf-8');

    if (!gamesData) {
      throw new Error('Файл пуст');
    }

    const parsedData = JSON.parse(gamesData);

    if (!parsedData.applist?.apps || !Array.isArray(parsedData.applist.apps)) {
      throw new Error(
        'Неверная структура файла: ожидался объект с applist.apps',
      );
    }

    const games = parsedData.applist.apps as SteamApp[];

    console.log(`Начинаем загрузку ${games.length} игр...`);

    const batchSize = 1000;
    let skippedCount = 0;

    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);

      // Фильтруем игры с обязательными полями
      const validGames = batch.filter(
        (game) => game.appid !== undefined && game.name !== undefined,
      );
      skippedCount += batch.length - validGames.length;

      await prisma.$transaction(
        validGames.map((game) =>
          prisma.game.upsert({
            where: { steamAppid: game.appid! }, // ! - так как мы уже отфильтровали undefined
            update: { name: game.name! },
            create: {
              steamAppid: game.appid!,
              name: game.name!,
              type: null,
              releaseDate: null,
              isFree: null,
              currentPlayers: null,
            },
          }),
        ),
      );

      console.log(
        `Обработано ${Math.min(i + batchSize, games.length)}/${games.length} игр`,
      );
    }

    if (skippedCount > 0) {
      console.warn(
        `Пропущено ${skippedCount} игр из-за отсутствия appid или name`,
      );
    }

    console.log('Все игры успешно добавлены!');
  } catch (error) {
    console.error('Ошибка при загрузке игр:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedGames();
