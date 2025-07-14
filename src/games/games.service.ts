import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  async getAllGames() {
    const games = await this.prisma.game.findMany({
      include: {
        hourlyStats: {
          orderBy: {
            timestamp: 'desc', // Сортировка статистики по времени (новые сначала)
          },
        },
      },
    });

    // Сортируем игры по currentPlayers из последней hourlyStats записи
    const sortedGames = games.sort((a, b) => {
      const aLatestPlayers = a.hourlyStats[0]?.currentPlayers || 0;
      const bLatestPlayers = b.hourlyStats[0]?.currentPlayers || 0;
      return bLatestPlayers - aLatestPlayers; // Сортировка по убыванию
    });

    // Берем только первые 100 игр с наибольшим онлайн-игроков
    return sortedGames.slice(0, 100);
  }
}
