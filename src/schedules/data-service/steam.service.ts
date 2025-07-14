// src/steam/steam.service.ts

import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import { SteamGameDto } from './stteam-game.dto';
import { prisma } from 'src/lib/prisma';
import { Game } from 'generated/prisma';
// import { async } from '../../utils/match';
import { TwitchApiService } from './twitch-api.service';
import { TwitchGame } from './type';

// ВАЖНО: Селекторы Steam могут меняться. Рекомендуется вынести их в конфигурационный файл.
const SELECTORS = {
  gameRow: '._2-RN6nWOY56sNmcDHu069P', // Общий контейнер строки с игрой
  gameLink: '._2C5PJOUH6RqyuBNEwaCE9X', // Элемент ссылки на игру
  gameName: '._1n_4-zvf0n4aqGEksbgW9N', // Название игры
  currentPlayers: '._3L0CDDIUaOKTGfqdpqmjcy', // Текущие игроки
  peakToday: '.yJB7DYKsuTG2AYhJdWTIk', // Пик за сегодня
};

@Injectable()
export class SteamParserService {
  constructor(private readonly TwitchApiService: TwitchApiService) {}

  private readonly logger = new Logger(SteamParserService.name);
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * @description Основной публичный метод для запуска парсинга.
   * @returns {Promise<SteamGameDto[]>} Массив с данными о самых популярных играх.
   */
  async fetchMostPlayedGames(): Promise<SteamGameDto[]> {
    try {
      this.logger.log('Запуск процесса парсинга...');
      await this.initializeBrowser();
      await this.navigateToMostPlayed();
      await this.scrollToLoadAllGames();
      const games = await this.parseGameData();
      this.logger.log(`✅ Успешно спарсено: ${games.length} игр.`);

      if (games.length < 100) {
        this.logger.warn(
          `Внимание: получено только ${games.length} из 100 игр.`,
        );
      } else {
        this.logger.log('Успешно получены все 100 игр!');
      }

      return games;
    } catch (error) {
      this.logger.error(
        '❌ Произошла критическая ошибка в процессе парсинга.',
        error,
      );
      // Попытка сделать скриншот для отладки
      //   if (this.page) {
      //     await this.page.screenshot({
      //       path: 'error_screenshot.png',
      //       fullPage: true,
      //     });
      //     this.logger.log('Скриншот ошибки сохранен в error_screenshot.png');
      //   }
      return []; // Возвращаем пустой массив в случае ошибки
    } finally {
      await this.closeBrowser();
    }
  }

  /**
   * @description Инициализирует экземпляр браузера и новую страницу.
   */
  private async initializeBrowser(): Promise<void> {
    this.logger.log('Инициализация браузера Puppeteer...');
    this.browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: null,
    });
    // this.browser = await puppeteer.launch({
    //   headless: true,
    //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
    //   defaultViewport: null,
    // });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );
    await this.page.setJavaScriptEnabled(true);
  }

  /**
   * @description Переходит на страницу "Самые популярные игры" в Steam.
   */
  private async navigateToMostPlayed(): Promise<void> {
    if (!this.page) throw new Error('Страница не инициализирована.');
    this.logger.log('Переход на страницу Steam Charts...');
    await this.page.goto('https://store.steampowered.com/charts/mostplayed', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
  }

  /**
   * @description Прокручивает страницу вниз для загрузки всех игр из списка.
   * Steam динамически подгружает контент при скролле.
   */
  private async scrollToLoadAllGames(): Promise<void> {
    if (!this.page) throw new Error('Страница не инициализирована.');
    this.logger.log('Начало прокрутки для загрузки всех игр...');

    let stableCount = 0;
    const maxStableAttempts = 3; // Количество попыток без изменения перед остановкой

    for (let attempt = 0; attempt < 15; attempt++) {
      const prevCount = await this.page.$$eval(
        SELECTORS.gameRow,
        (rows) => rows.length,
      );

      // Эмуляция прокрутки
      await this.page.evaluate('window.scrollBy(0, window.innerHeight)');
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Пауза для подгрузки

      const newCount = await this.page.$$eval(
        SELECTORS.gameRow,
        (rows) => rows.length,
      );

      this.logger.log(`Попытка ${attempt + 1}: найдено ${newCount} игр.`);

      if (newCount > prevCount) {
        stableCount = 0; // Сбрасываем счетчик, если есть новые элементы
      } else {
        stableCount++;
        if (stableCount >= maxStableAttempts) {
          this.logger.log('Количество игр не меняется. Завершаем прокрутку.');
          break;
        }
      }
    }
  }

  /**
   * @description Извлекает данные об играх со страницы.
   * @returns {Promise<SteamGameDto[]>}
   */
  private async parseGameData(): Promise<SteamGameDto[]> {
    if (!this.page) throw new Error('Страница не инициализирована.');
    this.logger.log('Сбор и обработка данных об играх...');

    return this.page.evaluate((selectors: typeof SELECTORS) => {
      const gamesData: SteamGameDto[] = [];
      const gameRows = document.querySelectorAll(selectors.gameRow);

      gameRows.forEach((row, index) => {
        const linkElement = row.querySelector<HTMLAnchorElement>(
          selectors.gameLink,
        );
        const nameElement = row.querySelector<HTMLElement>(selectors.gameName);
        const currentPlayersElement = row.querySelector<HTMLElement>(
          selectors.currentPlayers,
        );
        const peakTodayElement = row.querySelector<HTMLElement>(
          selectors.peakToday,
        );

        // Получаем ссылку и извлекаем App ID
        const link = linkElement?.href || 'N/A';
        const appIdMatch = link.match(/\/app\/(\d+)/);
        const steam_appid = appIdMatch ? parseInt(appIdMatch[1], 10) : 0;

        // Очищаем название
        const rawName = nameElement?.textContent?.trim() || 'N/A';
        const cleanName = rawName
          .replace(/\s*\(недоступно в вашем регионе\)\s*/gi, '') // Removes Russian regional restriction
          .replace(/\s*\(not available in your region\)\s*/gi, '') // Removes English regional restriction
          .replace(/[™®]/g, '') // Removes ™ and ® symbols
          .trim();

        // Функция для безопасного парсинга чисел
        const parseNumber = (text: string | null | undefined): number => {
          if (!text) return 0;
          return parseInt(text.replace(/\D/g, ''), 10) || 0;
        };

        const currentPlayers = parseNumber(currentPlayersElement?.textContent);
        const peakToday = parseNumber(peakTodayElement?.textContent);

        if (cleanName !== 'N/A' && steam_appid !== 0) {
          gamesData.push({
            rank: index + 1,
            name: cleanName,
            currentPlayers,
            peakToday,
            link_steam_shop: link,
            steam_appid,
          });
        }
      });

      return gamesData;
    }, SELECTORS);
  }

  /**
   * @description Корректно закрывает браузер.
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      this.logger.log('Закрытие браузера...');
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  private async getGamesFromDbBySteamAppid(
    steam_appid: number,
  ): Promise<Game | false> {
    const existingGame = await prisma.game.findUnique({
      where: { steamAppId: steam_appid },
    });
    if (existingGame) {
      return existingGame;
    }
    return false;
  }

  private async updateGameStatsInDB({
    gameId,
    rank,
    currentPlayers,
    peakToday,
    twitch_view,
  }: {
    gameId: number;
    rank: number;
    currentPlayers: number;
    peakToday: number;
    twitch_view: number;
  }): Promise<void> {
    try {
      console.log(
        twitch_view,
        gameId,
        rank,
        currentPlayers,
        peakToday,
        'inside updateGameStatsInDB',
      );

      await prisma.gameHourlyStats.create({
        data: {
          gameId: gameId,
          rank: rank,
          currentPlayers: currentPlayers,
          peakToday: peakToday,
          twitch_view: twitch_view,
        },
      });
      console.log(`Статистика для игры с ID ${gameId} успешно добавлена ffff`);
    } catch (error) {
      console.error(
        `Ошибка при добавлении статистики для игры с ID ${gameId}:`,
        error,
      );
      throw error; // или обработайте ошибку по-другому
    }
  }

  private async addTwitchDataToGame({
    gameId,
    twitchGameId,
    name,
    box_art_url,
  }: {
    gameId: number;
    twitchGameId: string;
    name: string;
    box_art_url: string;
  }): Promise<void> {
    await prisma.game.update({
      where: { id: gameId },
      data: {
        twitchGameId: Number(twitchGameId),
        twitchName: name,
        twitch_box_art_url: box_art_url,
      },
    });
  }

  private async addGameIntoDB({
    game,
    twitchData,
  }: {
    game: SteamGameDto;
    twitchData: TwitchGame;
  }): Promise<void> {
    await prisma.game.create({
      data: {
        steamName: game.name,
        rank_steam: game.rank,
        steam_shop_url: game.link_steam_shop,
        steamAppId: game.steam_appid,
        twitchGameId: Number(twitchData.id),
        twitchName: twitchData.name,
        twitch_box_art_url: twitchData.box_art_url,
      },
    });
    const gameFromDb = await prisma.game.findFirst({
      where: { steamAppId: game.steam_appid },
    });
    if (gameFromDb) {
      const views = await this.TwitchApiService.getViews(gameFromDb.id);

      await this.updateGameStatsInDB({
        gameId: gameFromDb.id,
        rank: game.rank,
        currentPlayers: game.currentPlayers,
        peakToday: game.peakToday,
        twitch_view: views || 0,
      });
    }
  }
  public async updateGamesInDB(games: SteamGameDto[]): Promise<void> {
    const updatedGames = games;

    for (const game of updatedGames) {
      const existingGame = await this.getGamesFromDbBySteamAppid(
        game.steam_appid,
      );

      if (existingGame && existingGame.twitchGameId) {
        const views = await this.TwitchApiService.getViews(
          existingGame.twitchGameId,
        );
        console.log(views, 'views before updateDto');

        const updateDto = {
          gameId: existingGame.id,
          rank: game.rank,
          currentPlayers: game.currentPlayers,
          peakToday: game.peakToday,
          twitch_view: views || 0,
        };
        console.log(updateDto, 'updateDto');

        await this.updateGameStatsInDB(updateDto);
      } else if (existingGame && !existingGame.twitchGameId) {
        const twitchGame = await this.TwitchApiService.findBestMatch(game.name);

        if (twitchGame) {
          await this.addTwitchDataToGame({
            gameId: existingGame.id,
            twitchGameId: twitchGame.id,
            name: twitchGame.name,
            box_art_url: twitchGame.box_art_url,
          });
          const views = await this.TwitchApiService.getViews(
            parseInt(twitchGame.id),
          );

          const updateDto = {
            gameId: existingGame.id,
            rank: game.rank,
            currentPlayers: game.currentPlayers,
            peakToday: game.peakToday,
            twitch_view: views || 0,
          };
          await this.updateGameStatsInDB(updateDto);
        } else {
          continue;
        }
      }
      if (!existingGame) {
        const twitchGame = await this.TwitchApiService.findBestMatch(game.name);
        if (twitchGame) {
          await this.addGameIntoDB({ game, twitchData: twitchGame });
        }
      }
    }
  }
}
