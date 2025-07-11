// File: updateTwitchViewers.ts
import axios from 'axios';
import { PrismaClient } from './generated/prisma';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Twitch API configuration
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT;
const TWITCH_ACCESS_TOKEN = process.env.TWITCH_BEARER;

if (!TWITCH_CLIENT_ID || !TWITCH_ACCESS_TOKEN) {
  throw new Error('Twitch credentials are not set in environment variables');
}

/**
 * Fetches live streams for a specific game from Twitch API
 * @param gameId Twitch game ID
 * @returns Array of stream objects
 */
async function getTwitchStreams(gameId: string) {
  try {
    const response = await axios.get(
      `https://api.twitch.tv/helix/streams?game_id=${gameId}&type=live&first=50`,
      {
        headers: {
          'Client-ID': TWITCH_CLIENT_ID,
          Authorization: `Bearer ${TWITCH_ACCESS_TOKEN}`,
        },
      },
    );

    return response.data.data;
  } catch (error) {
    console.error(`Error fetching Twitch streams for game ${gameId}:`, error);
    return [];
  }
}

/**
 * Updates viewer count in database for a specific game
 * @param game Game object from database
 */
async function updateGameStats(game: {
  id: number;
  twitchGameId: number | null;
  steamName: string;
  hourlyStats: Array<{
    currentPlayers: number;
    peakToday: number;
    rank: number | null;
  }>;
}) {
  if (!game.twitchGameId) {
    console.log(`Game "${game.steamName}" has no Twitch ID, skipping`);
    return;
  }

  try {
    console.log(
      `Processing game: ${game.steamName} (Twitch ID: ${game.twitchGameId})`,
    );

    // Get streams data from Twitch
    const streams = await getTwitchStreams(game.twitchGameId.toString());

    // Calculate total viewers
    const totalViewers = streams.reduce(
      (sum, stream) => sum + stream.viewer_count,
      0,
    );
    console.log(
      `- Found ${streams.length} streams with ${totalViewers} total viewers`,
    );

    // Get previous stats to maintain existing data
    const latestStats = game.hourlyStats[0] || null;

    // Create new hourly stats record
    await prisma.gameHourlyStats.create({
      data: {
        gameId: game.id,
        currentPlayers: latestStats?.currentPlayers || 0,
        peakToday: latestStats?.peakToday || 0,
        rank: latestStats?.rank || null,
        twitch_view: totalViewers,
      },
    });

    console.log(`- Successfully updated stats for game "${game.steamName}"`);
    console.log(`  - Current players: ${latestStats?.currentPlayers || 0}`);
    console.log(`  - Peak today: ${latestStats?.peakToday || 0}`);
    console.log(`  - Twitch viewers: ${totalViewers}`);
  } catch (error) {
    console.error(`Error updating stats for game "${game.steamName}":`, error);
  }
}

// Main execution
(async () => {
  try {
    // Get first 50 games from database
    const games = await prisma.game.findMany({
      take: 50,
      include: {
        hourlyStats: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 1,
        },
      },
    });

    console.log(`Found ${games.length} games to process`);

    // Process each game sequentially to avoid API rate limits
    for (const game of games) {
      await updateGameStats(game);
      // Add delay between requests to avoid hitting Twitch API rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log('Finished processing all games');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
