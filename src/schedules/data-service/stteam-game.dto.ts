// src/steam/dto/steam-game.dto.ts

/**
 * @description Data Transfer Object (DTO) для представления данных об игре в Steam.
 * Использование класса вместо интерфейса позволяет в будущем легко интегрировать
 * декораторы для валидации (например, class-validator).
 */
export class SteamGameDto {
  /**
   * @description Порядковый номер в чарте.
   * @example 1
   */
  rank: number;

  /**
   * @description Название игры.
   * @example 'Counter-Strike 2'
   */
  name: string;

  /**
   * @description Количество игроков онлайн в данный момент.
   * @example 1250345
   */
  currentPlayers: number;

  /**
   * @description Пиковое количество игроков за сегодня.
   * @example 1320456
   */
  peakToday: number;

  /**
   * @description Прямая ссылка на страницу игры в магазине Steam.
   * @example 'https://store.steampowered.com/app/730/CounterStrike_2/'
   */
  link_steam_shop: string;

  /**
   * @description Уникальный идентификатор приложения Steam (App ID).
   * @example 730
   */
  steam_appid: number;
}
