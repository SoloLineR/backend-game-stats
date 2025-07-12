import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  async getAllGames() {
    return this.prisma.game.findMany({
      include: {
        hourlyStats: true,
      },
    });
  }
}
