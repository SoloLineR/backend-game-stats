import puppeteer from 'puppeteer';
import fs from 'fs';

interface SteamGame {
  rank?: number;
  name: string;
  //   price: string;
  currentPlayers: number;
  peakToday: number;
  link_steam_shop: string;
  steam_appid: number;
}

async function parseSteamMostPlayed(): Promise<SteamGame[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null, // Полноразмерный просмотр
  });

  const page = await browser.newPage();

  try {
    // 1. Настройка браузера
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    );
    await page.setJavaScriptEnabled(true);

    // 2. Загрузка страницы с обработкой редиректов
    console.log('Загружаем страницу...');
    await page.goto('https://store.steampowered.com/charts/mostplayed', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // 3. Функция для проверки количества загруженных игр
    const checkGamesCount = async (): Promise<number> => {
      return await page.evaluate(() => {
        return document.querySelectorAll('._1n_4-zvf0n4aqGEksbgW9N').length;
      });
    };

    // 4. Агрессивная прокрутка с контролем результатов
    console.log('Загружаем все игры...');
    let gamesCount = 0;
    let stableCount = 0;
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const prevCount = await checkGamesCount();

      // Прокрутка с разной интенсивностью
      await page.evaluate(async () => {
        window.scrollBy(0, window.innerHeight * 0.8);
        await new Promise((resolve) => setTimeout(resolve, 200));
        window.scrollBy(0, window.innerHeight * 0.8);
      });

      await new Promise((resolve) => setTimeout(resolve, 1500)); // Ждём загрузки

      const newCount = await checkGamesCount();

      if (newCount > prevCount) {
        gamesCount = newCount;
        stableCount = 0;
      } else {
        stableCount++;
        if (stableCount >= 3) break; // Прекращаем если 3 попытки без изменений
      }

      console.log(`Попытка ${attempt + 1}: найдено ${newCount} игр`);
    }

    // 5. Форсированная загрузка (если всё ещё не все)
    if (gamesCount < 100) {
      console.log('Пробуем дополнительную загрузку...');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // 6. Окончательный парсинг
    console.log('Парсим данные...');
    const games = await page.evaluate(() => {
      const gamesData: SteamGame[] = [];
      const containers = document.querySelectorAll('._2-RN6nWOY56sNmcDHu069P');

      containers.forEach((container, index) => {
        // Получаем и очищаем название
        const rawName =
          container
            .querySelector('._1n_4-zvf0n4aqGEksbgW9N')
            ?.textContent?.trim() || 'N/A';

        const cleanName = rawName
          .replace(/\s*\(недоступно в вашем регионе\)\s*/gi, '') // Убирает региональное ограничение
          .replace(/[™®]/g, '') // Убирает символы ™ и ®
          .trim();

        // Парсим количество игроков
        const playersText =
          container
            .querySelector('._3L0CDDIUaOKTGfqdpqmjcy')
            ?.textContent?.trim() || '0';
        const peakText =
          container
            .querySelector('.yJB7DYKsuTG2AYhJdWTIk')
            ?.textContent?.trim() || '0';
        const steamAppId =
          container
            .querySelector('._2C5PJOUH6RqyuBNEwaCE9X')
            ?.getAttribute('href')
            ?.split('/app/')[1]
            ?.split('/')[0] || 'N/A';
        // Преобразуем в числа (удаляем все нецифровые символы)
        const currentPlayers =
          parseInt(playersText.replace(/\D/g, ''), 10) || 0;
        const peakToday = parseInt(peakText.replace(/\D/g, ''), 10) || 0;

        gamesData.push({
          rank: index + 1,
          name: cleanName,
          // price: container.querySelector('._3j4dI1yA7cRfCvK8h406OB')?.textContent?.trim() || 'N/A',
          currentPlayers,
          peakToday,
          link_steam_shop:
            container
              .querySelector('._2C5PJOUH6RqyuBNEwaCE9X')
              ?.getAttribute('href') || 'N/A',
          steam_appid: Number(steamAppId),
        });
      });

      return gamesData;
    });

    console.log(`✅ Успешно спарсено: ${games.length} игр`);
    return games;
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await page.screenshot({ path: 'error.png', fullPage: true });
    return [];
  } finally {
    await browser.close();
  }
}

// Запуск и сохранение
parseSteamMostPlayed()
  .then((games) => {
    fs.writeFileSync('steam_games_full.json', JSON.stringify(games, null, 2));
    console.log('Данные сохранены в steam_games_full.json');

    // Проверка количества
    if (games.length < 100) {
      console.warn(`Внимание: получено только ${games.length} из 100 игр`);
    } else {
      console.log('Успешно получены все 100 игр!');
    }

    process.exit(0);
  })
  .catch((err) => {
    console.error('Фатальная ошибка:', err);
    process.exit(1);
  });
