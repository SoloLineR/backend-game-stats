import { Controller, Get } from '@nestjs/common';
import { GamesService } from './games.service';
import { SteamParserService } from 'src/schedules/data-service/steam.service';

@Controller('games')
export class GamesController {
  constructor(
    private readonly gamesService: GamesService,
    private readonly steamParserService: SteamParserService,
  ) {}

  @Get()
  getAllGames() {
    return this.gamesService.getAllGames();
  }

  @Get('steam')
  async getSteamGames() {
    const games = await this.steamParserService.fetchMostPlayedGames();
    await this.steamParserService.updateGamesInDB(games);
    return this.gamesService.getAllGames();
  }
}
