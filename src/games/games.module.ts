import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { PrismaService } from 'src/prisma.service';
import { GamesService } from './games.service';

@Module({
  controllers: [GamesController],
  providers: [GamesController, PrismaService, GamesService],
})
export class GamesModule {}
