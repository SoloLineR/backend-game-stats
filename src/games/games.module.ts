import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { PrismaService } from 'src/prisma.service';
import { GamesService } from './games.service';
import { SteamParserService } from 'src/schedules/data-service/steam.service';

@Module({
  controllers: [GamesController],
  providers: [GamesController, PrismaService, GamesService, SteamParserService],
})
export class GamesModule {}
