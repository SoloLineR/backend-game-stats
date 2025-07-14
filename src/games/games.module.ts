import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { PrismaService } from 'src/prisma.service';
import { GamesService } from './games.service';
import { SteamParserService } from 'src/schedules/data-service/steam.service';
import { TwitchApiService } from 'src/schedules/data-service/twitch-api.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [GamesController],
  providers: [
    GamesController,
    PrismaService,
    GamesService,
    SteamParserService,
    TwitchApiService,
    ConfigService,
  ],
  exports: [TwitchApiService],
})
export class GamesModule {}
