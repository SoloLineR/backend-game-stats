// File: src/services/game-sync.service.ts
import { PrismaClient } from '../../generated/prisma';
import { SteamParserService } from '../schedules/data-service/steam.service';
import { SteamGameDto } from '../schedules/data-service/stteam-game.dto';
import { TwitchApiService } from '../schedules/data-service/twitch-api.service';

interface BatchResult {
  steam: string;
  twitch?: string;
  error?: string;
  success: boolean;
}

/**
 * @description Orchestrates the synchronization of game data between Steam and Twitch,
 * and saves the combined data to the database.
 */
export class GameSyncService {
  private readonly BATCH_SIZE = 5;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly steamService: SteamParserService,
    private readonly twitchService: TwitchApiService,
  ) {}

  /**
   * @description Processes a single batch of games.
   */
  private async _processBatch(
    batch: SteamGameDto[],
    tx: Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >,
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (const game of batch) {
      try {
        const twitchGame = await this.twitchService.findBestMatch(game.name);

        let twitchViewers: number | null = null;

        if (twitchGame) {
          // Fetch Twitch viewer count if a match is found
          twitchViewers = await this.twitchService.getViews(
            parseInt(twitchGame.id),
          );
        }

        const dbGame = await tx.game.upsert({
          where: { steamName: game.name },
          update: {
            rank_steam: game.rank,
            steam_shop_url: game.link_steam_shop,
            steamAppId: game.steam_appid,
            twitchGameId: twitchGame ? parseInt(twitchGame.id) : null,
            twitchName: twitchGame?.name ?? null,
            twitch_box_art_url:
              twitchGame?.box_art_url.replace('{width}x{height}', '285x380') ??
              null,
          },
          create: {
            steamName: game.name,
            steamAppId: game.steam_appid,
            rank_steam: game.rank,
            steam_shop_url: game.link_steam_shop,
            twitchGameId: twitchGame ? parseInt(twitchGame.id) : null,
            twitchName: twitchGame?.name ?? null,
            twitch_box_art_url:
              twitchGame?.box_art_url.replace('{width}x{height}', '285x380') ??
              null,
          },
        });

        // Create a new hourly stat record
        await tx.gameHourlyStats.create({
          data: {
            gameId: dbGame.id,
            currentPlayers: game.currentPlayers,
            peakToday: game.peakToday,
            rank: game.rank,
            twitch_view: twitchViewers, // Populated with the fetched Twitch viewer count
          },
        });

        if (twitchGame) {
          console.log(
            `[MATCH] Steam: ${game.name} | Twitch: ${twitchGame.name} | Viewers: ${twitchViewers}`,
          );
          results.push({
            steam: game.name,
            twitch: twitchGame.name,
            success: true,
          });
        } else {
          console.log(`[SKIP] No Twitch match found for: ${game.name}`);
          results.push({
            steam: game.name,
            success: true,
            error: 'No matching Twitch game found',
          });
        }
      } catch (error) {
        console.error(`[ERROR] Failed to process game ${game.name}:`, error);
        results.push({
          steam: game.name,
          error: error instanceof Error ? error.message : String(error),
          success: false,
        });
      }
    }
    return results;
  }

  /**
   * @description Fetches all games and processes them in batches to sync with the database.
   */
  public async syncAllGames(): Promise<{
    successCount: number;
    failCount: number;
  }> {
    const allGames = await this.steamService.fetchMostPlayedGames();
    const totalGames = allGames.length;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < totalGames; i += this.BATCH_SIZE) {
      const batch = allGames.slice(i, i + this.BATCH_SIZE);

      try {
        const batchResults = await this.prisma.$transaction(
          (tx) => this._processBatch(batch, tx),
          { maxWait: 30000, timeout: 30000 },
        );

        batchResults.forEach((result) =>
          result.success ? successCount++ : failCount++,
        );

        console.log(
          `Progress: ${Math.min(
            i + this.BATCH_SIZE,
            totalGames,
          )}/${totalGames} | Success: ${successCount} | Failed: ${failCount}`,
        );
      } catch (error) {
        failCount += batch.length;
        console.error(
          `Error processing batch ${i}-${i + this.BATCH_SIZE}:`,
          error,
        );
      }

      // Pause between batches to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return { successCount, failCount };
  }
}
