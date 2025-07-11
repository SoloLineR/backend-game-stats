import { PrismaClient } from './generated/prisma';
import steamGamesData from './steam_games_full.json';

interface SteamGame {
  rank: number;
  name: string;
  currentPlayers: number;
  peakToday: number;
  link_steam_shop: string;
  steam_appid: number;
}

const prisma = new PrismaClient();

async function insertSteamGames(steamGames: SteamGame[]) {
  try {
    await prisma.$transaction(async (tx) => {
      for (const game of steamGames) {
        // 1. Обновляем или создаем игру
        const dbGame = await tx.game.upsert({
          where: { steamName: game.name },
          update: {
            rank_steam: game.rank, // Обновляем текущий ранг в основной таблице
            steam_shop_url: game.link_steam_shop,
            steamAppId: game.steam_appid,
          },
          create: {
            steamName: game.name,
            steamAppId: game.steam_appid,
            rank_steam: game.rank, // Сохраняем начальный ранг
            steam_shop_url: game.link_steam_shop,
            twitchGameId: null,
            twitchName: null,
            twitch_box_art_url: null,
          },
        });

        // 2. Создаем запись статистики с рангом
        await tx.gameHourlyStats.create({
          data: {
            gameId: dbGame.id,
            currentPlayers: game.currentPlayers,
            peakToday: game.peakToday,
            rank: game.rank, // Добавляем ранг в исторические данные
          },
        });
      }
    });

    console.log('Данные успешно добавлены!');
  } catch (error) {
    console.error('Ошибка при добавлении данных:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Загрузка данных
const steamGames: SteamGame[] = steamGamesData as SteamGame[];

// Запуск импорта
insertSteamGames(steamGames).catch(console.error);
