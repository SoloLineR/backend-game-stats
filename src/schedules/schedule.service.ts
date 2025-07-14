import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SteamParserService } from './data-service/steam.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly steamParserService: SteamParserService) {}

  @Cron('0 * * * *') // Выполняется в 0 секунд каждой минуты каждого часа
  // @Cron('0 * * * * *') // Срабатывает в 0 секунд каждой минуты
  async handleHourlyTask() {
    this.logger.log('Running hourly task...');
    try {
      const games = await this.steamParserService.fetchMostPlayedGames();
      await this.steamParserService.updateGamesInDB(games);
      this.logger.log('Hourly task completed successfully');
    } catch (error) {
      this.logger.error('Error in hourly task:', error);
    }
  }
}
