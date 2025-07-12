// File: src/services/twitch-api.service.ts
import axios from 'axios';
import { withRetry } from '../../utils/match'; // Assuming withRetry is still needed
import { TwitchGame, TwitchResponse, TwitchStream } from './type'; // Assuming TwitchStream type is defined
import string_comparison from 'string-comparison';

/**
 * @description Service for handling all communications with the Twitch Helix API.
 */
export class TwitchApiService {
  private readonly clientId: string;
  private readonly accessToken: string;
  private readonly twitchApiUrl = 'https://api.twitch.tv/helix';

  constructor(clientId: string, accessToken: string) {
    if (!clientId || !accessToken) {
      throw new Error('Twitch Client ID и Access Token обязательны.');
    }
    this.clientId = clientId;
    this.accessToken = accessToken;
  }

  /**
   * @description Fetches live streams for a specific game from Twitch API.
   * @param gameId Twitch game ID.
   * @returns Array of stream objects.
   */
  private async _getTwitchStreams(gameId: string): Promise<TwitchStream[]> {
    try {
      const response = await axios.get<{ data: TwitchStream[] }>(
        `${this.twitchApiUrl}/streams?game_id=${gameId}&type=live&first=50`,
        {
          headers: {
            'Client-ID': this.clientId,
            Authorization: `Bearer ${this.accessToken}`,
          },
          timeout: 5000,
        },
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching Twitch streams for game ${gameId}:`, error);
      return [];
    }
  }

  /**
   * @description Calculates the total viewer count for a given Twitch game ID.
   * @param twitchGameId The Twitch game ID.
   * @returns Promise resolving to the total viewer count or null if an error occurs.
   */
  public async getViews(twitchGameId: number): Promise<number | null> {
    try {
      const streams = await this._getTwitchStreams(twitchGameId.toString());
      const totalViewers = streams.reduce(
        (sum, stream) => sum + stream.viewer_count,
        0,
      );
      return totalViewers;
    } catch (error) {
      console.error(
        `Error calculating total views for Twitch game ID ${twitchGameId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * @description Ищет игру на Twitch и возвращает лучшее совпадение.
   * @param gameName Имя игры для поиска.
   * @returns Promise, который разрешается в объект TwitchGame или null, если хорошее совпадение не найдено.
   */
  public async findBestMatch(gameName: string): Promise<TwitchGame | null> {
    return withRetry(async () => {
      try {
        const response = await axios.get<TwitchResponse>(
          `${this.twitchApiUrl}/search/categories`,
          {
            params: { query: encodeURIComponent(gameName), first: 20 },
            headers: {
              'Client-ID': this.clientId,
              Authorization: `Bearer ${this.accessToken}`,
            },
            timeout: 5000,
          },
        );

        if (!response.data?.data?.length) return null;

        const scoredResults = response.data.data
          .map((game) => ({
            game,
            // Используем jaroWinkler.similarity для получения коэффициента сходства.
            // Он возвращает значение от 0.0 до 1.0, где 1.0 - идеальное совпадение.
            // Умножаем на 100, чтобы получить процентный балл, соответствующий вашему порогу.
            score:
              string_comparison.jaroWinkler.similarity(
                gameName.toLowerCase(),
                game.name.toLowerCase(),
              ) * 100,
          }))
          .filter((result) => result.score >= 70); // Увеличьте пороговый балл, если нужно, так как Jaro-Winkler дает более высокие значения

        if (scoredResults.length === 0) return null;

        scoredResults.sort((a, b) => b.score - a.score);
        return scoredResults[0].game;
      } catch (error) {
        console.error(`Ошибка при поиске игры на Twitch "${gameName}":`, error);
        return null;
      }
    });
  }
}
