import { PrismaClient } from './generated/prisma';
import axios from 'axios';

const prisma = new PrismaClient();
const STEAM_API_KEY = 'C3907E4921072BEE2E4717DFD96E5CF1'; // Замените на реальный ключ

// Конфигурация
const GAME_NAME = 'ELDEN RING'; // Базовое название для поиска
const STEAM_API_URL =
  'https://partner.steam-api.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/';

async function updateGamePlayers() {
  try {
    // 1. Поиск игры по имени (с учетом возможных вариаций)
    const games = await prisma.game.findMany({
      where: {
        name: {
          contains: GAME_NAME, // Ищем частичное совпадение
          mode: 'insensitive', // Без учета регистра
        },
      },
      select: {
        steamAppid: true,
        name: true,
      },
      take: 5, // Ограничиваем количество результатов
    });

    if (games.length === 0) {
      throw new Error(`Игра "${GAME_NAME}" не найдена в базе`);
    }

    // Выбираем наиболее релевантный результат (можно доработать логику)
    const targetGame =
      games.find((g) => g.name.toLowerCase().includes('path of exile')) ||
      games[0];

    console.log(
      `Найдена игра: ${targetGame.name} (ID: ${targetGame.steamAppid})`,
    );

    // 2. Запрос к Steam API
    const response = await axios.get(STEAM_API_URL, {
      params: {
        // key: STEAM_API_KEY,
        appid: targetGame.steamAppid,
      },
      timeout: 5000,
    });

    const playerCount = response.data.response?.player_count;
    if (typeof playerCount !== 'number') {
      throw new Error('Неверный формат данных от Steam API');
    }

    console.log(`Текущих игроков: ${playerCount}`);

    // 3. Обновление данных
    await prisma.$transaction([
      prisma.game.update({
        where: { steamAppid: targetGame.steamAppid },
        data: {
          currentPlayers: playerCount,
          lastUpdated: new Date(),
        },
      }),
      prisma.playerStat.create({
        data: {
          steamAppid: targetGame.steamAppid,
          players: playerCount,
        },
      }),
    ]);

    console.log('Данные успешно обновлены!');
    return targetGame.steamAppid; // Возвращаем ID для дальнейшего использования
  } catch (error) {
    console.error('Ошибка при обновлении:');
    console.error(error instanceof Error ? error.message : error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск с обработкой результатов
updateGamePlayers()
  .then((appid) => console.log(`Завершено для appid: ${appid}`))
  .catch(() => console.log('Обновление завершено с ошибками'));
