import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from 'src/prisma.service';
import { GamesModule } from './games/games.module';
import { SteamParserService } from './schedules/data-service/steam.service';

@Module({
  imports: [GamesModule, ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, PrismaService, SteamParserService],
  exports: [AppService, PrismaService, SteamParserService],
})
export class AppModule {}
