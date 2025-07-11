import { PrismaClient } from './generated/prisma';
import axios from 'axios';
import steamGamesData from './steam_games_full.json';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface TwitchGame {
  id: string;
  name: string;
  box_art_url: string;
}

interface TwitchResponse {
  data: TwitchGame[];
  pagination?: {
    cursor?: string;
  };
}

interface BatchResult {
  steam: string;
  twitch?: string;
  error?: string;
  success: boolean;
}

// Функция для сравнения строк (чем выше score, тем лучше совпадение)
function matchScore(searchTerm: string, candidate: string): number {
  const searchLower = searchTerm.toLowerCase();
  const candidateLower = candidate.toLowerCase();

  // Полное совпадение
  if (searchLower === candidateLower) return 100;

  // Удаляем неалфавитные символы для более точного сравнения
  const cleanSearch = searchLower.replace(/[^a-z0-9\s]/g, '');
  const cleanCandidate = candidateLower.replace(/[^a-z0-9\s]/g, '');

  // Начинается с искомого термина
  if (cleanCandidate.startsWith(cleanSearch)) return 90;

  // Содержит точное совпадение слова
  if (cleanCandidate.includes(` ${cleanSearch} `)) return 80;

  // Частичное совпадение
  if (cleanCandidate.includes(cleanSearch)) return 60;

  // Разделяем на слова и считаем совпадения
  const searchWords = cleanSearch.split(/\s+/).filter((w) => w.length > 2);
  const candidateWords = cleanCandidate
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (searchWords.length === 0) return 0;

  const matchedWords = searchWords.filter((word) =>
    candidateWords.includes(word),
  ).length;

  return (matchedWords / searchWords.length) * 70;
}

// Функция с повторными попытками
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function findBestTwitchMatch(
  gameName: string,
  accessToken: string,
  clientId: string,
): Promise<TwitchGame | null> {
  return withRetry(async () => {
    try {
      const response = await axios.get<TwitchResponse>(
        'https://api.twitch.tv/helix/search/categories',
        {
          params: {
            query: encodeURIComponent(gameName),
            first: 20,
          },
          headers: {
            'Client-ID': clientId,
            Authorization: `Bearer ${accessToken}`,
          },
          timeout: 5000,
        },
      );

      if (!response.data.data?.length) return null;

      const scoredResults = response.data.data
        .map((game) => ({
          game,
          score: matchScore(gameName, game.name),
        }))
        .filter((result) => result.score >= 40);

      if (scoredResults.length === 0) return null;

      scoredResults.sort((a, b) => b.score - a.score);
      return scoredResults[0].game;
    } catch (error) {
      console.error(
        `Ошибка при поиске игры "${gameName}":`,
        error.response?.data || error.message,
      );
      return null;
    }
  });
}

async function processGameBatch(
  batch: any[],
  tx: any,
  accessToken: string,
  clientId: string,
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];

  for (const game of batch) {
    try {
      const twitchGame = await findBestTwitchMatch(
        game.name,
        accessToken,
        clientId,
      );

      const dbGame = await tx.game.upsert({
        where: { steamName: game.name },
        update: {
          rank_steam: game.rank,
          steam_shop_url: game.link_steam_shop,
          steamAppId: game.steam_appid,
          ...(twitchGame
            ? {
                twitchGameId: parseInt(twitchGame.id),
                twitchName: twitchGame.name,
                twitch_box_art_url: twitchGame.box_art_url.replace(
                  '{width}x{height}',
                  '285x380',
                ),
              }
            : {
                twitchGameId: null,
                twitchName: null,
                twitch_box_art_url: null,
              }),
        },
        create: {
          steamName: game.name,
          steamAppId: game.steam_appid,
          rank_steam: game.rank,
          steam_shop_url: game.link_steam_shop,
          ...(twitchGame
            ? {
                twitchGameId: parseInt(twitchGame.id),
                twitchName: twitchGame.name,
                twitch_box_art_url: twitchGame.box_art_url.replace(
                  '{width}x{height}',
                  '285x380',
                ),
              }
            : {
                twitchGameId: null,
                twitchName: null,
                twitch_box_art_url: null,
              }),
        },
      });

      await tx.gameHourlyStats.create({
        data: {
          gameId: dbGame.id,
          currentPlayers: game.currentPlayers,
          peakToday: game.peakToday,
          rank: game.rank,
        },
      });

      if (twitchGame) {
        console.log(
          `[MATCH] Steam: ${game.name} | Twitch: ${twitchGame.name} (Score: ${matchScore(game.name, twitchGame.name)})`,
        );
        results.push({
          steam: game.name,
          twitch: twitchGame.name,
          success: true,
        });
      } else {
        console.log(`[SKIP] Не найдено совпадение для: ${game.name}`);
        results.push({
          steam: game.name,
          success: true,
          error: 'No matching Twitch game found',
        });
      }
    } catch (error) {
      console.error(`[ERROR] Ошибка при обработке игры ${game.name}:`, error);
      results.push({
        steam: game.name,
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
    }
  }

  return results;
}

async function seedDatabase() {
  const TWITCH_ACCESS_TOKEN = process.env.TWITCH_BEARER;
  const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT;

  if (!TWITCH_ACCESS_TOKEN || !TWITCH_CLIENT_ID) {
    throw new Error('Twitch credentials not configured');
  }

  const BATCH_SIZE = 5;
  const totalGames = steamGamesData.length;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < totalGames; i += BATCH_SIZE) {
    const batch = steamGamesData.slice(i, i + BATCH_SIZE);

    try {
      const batchResults = await prisma.$transaction(
        async (tx) => {
          return await processGameBatch(
            batch,
            tx,
            TWITCH_ACCESS_TOKEN,
            TWITCH_CLIENT_ID,
          );
        },
        {
          maxWait: 30000,
          timeout: 30000,
        },
      );

      batchResults.forEach((result) => {
        if (result.success) successCount++;
        else failCount++;
      });

      console.log(
        `Прогресс: ${Math.min(i + BATCH_SIZE, totalGames)}/${totalGames} | Успешно: ${successCount} | Ошибки: ${failCount}`,
      );
    } catch (error) {
      failCount += batch.length;
      console.error(
        `Ошибка при обработке пакета ${i}-${i + BATCH_SIZE}:`,
        error,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { successCount, failCount };
}

async function main() {
  try {
    console.log('Начало загрузки данных...');
    const { successCount, failCount } = await seedDatabase();
    console.log(`Завершено! Успешно: ${successCount}, Ошибки: ${failCount}`);
  } catch (error) {
    console.error('Критическая ошибка:', error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
