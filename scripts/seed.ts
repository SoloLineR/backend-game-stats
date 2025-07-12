import dotenv from 'dotenv';
import { prisma } from '../src/lib/prisma';
import { GameSyncService } from '../src/games/game-sync.service';
import { SteamParserService } from '../src/schedules/data-service/steam.service';
import { TwitchApiService } from '../src/schedules/data-service/twitch-api.service';

// Load environment variables from .env file
dotenv.config();

async function main() {
  console.log('Starting database seeding process...');

  const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT;
  const TWITCH_ACCESS_TOKEN = process.env.TWITCH_BEARER;
  if (!TWITCH_CLIENT_ID || !TWITCH_ACCESS_TOKEN) {
    throw new Error(
      'TWITCH_CLIENT_ID and TWITCH_ACCESS_TOKEN must be set in .env file',
    );
  }

  // 1. Initialize services
  const steamService = new SteamParserService();
  const twitchService = new TwitchApiService(
    TWITCH_CLIENT_ID,
    TWITCH_ACCESS_TOKEN,
  );
  const gameSyncService = new GameSyncService(
    prisma,
    steamService,
    twitchService,
  );

  try {
    // 2. Run the synchronization process
    const { successCount, failCount } = await gameSyncService.syncAllGames();
    console.log(`\nSeeding complete!`);
    console.log(`- Successfully processed: ${successCount}`);
    console.log(`- Failed to process:     ${failCount}`);
  } catch (error) {
    console.error(
      '\nA critical error occurred during the seeding process:',
      error,
    );
    process.exit(1);
  } finally {
    // 3. Disconnect Prisma client
    await prisma.$disconnect();
    console.log('Database connection closed.');
  }
}

main();
