// telegram.js
import TelegramBot from "node-telegram-bot-api";
import pg from "pg";

const { Pool } = pg;

// --- DB соединение
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
});

async function findGuideByTelegramId(telegramId) {
  const r = await pool.query(
    `SELECT id, name, is_active, subscription_until
       FROM guides
      WHERE telegram_id = $1
      LIMIT 1`,
    [telegramId]
  );
  return r.rows[0] || null;
}

const token =
  process.env.TELEGRAM_BOT_TOKEN ||
  '8314275448:AAG6bC-5ms-EsOZyaQ2LozKoyQkSS5gOQhs' ||
  "ТВОЙ_ТОКЕН";
export const bot = new TelegramBot(token, { polling: true });

// Утилита форматирования даты (ru-RU)
function formatDateRu(d) {
  try {
    return new Date(d).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return String(d);
  }
}

// Проверка активной подписки: и флаг, и дата
function hasActiveSubscription(guide) {
  const flag = !!guide.is_active;
  const until = guide.subscription_until ? new Date(guide.subscription_until) : null;
  const today = new Date();
  // Считаем активной, если флаг true и дата не прошла (или дата отсутствует — тогда только по флагу)
  const dateOk = !until || until >= today;
  return flag && dateOk;
}

// /start — приветствие + следующее сообщение и кнопка "Отправить мой Telegram ID"
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "друг";

  await bot.sendMessage(chatId, `Привет, я бот платформы Гидов.`);

  await bot.sendMessage(
    chatId,
    `Проверим, являешься ли ты гидом?`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📤 Отправить мой Telegram ID", callback_data: "send_id" }],
        ],
      },
    }
  );
});

// Обработка нажатий на кнопки
bot.on("callback_query", async (query) => {
  try {
    if (!query?.data) return;

    const chatId = query.message?.chat?.id;
    const userId = query.from?.id; // telegram_id
    const data = query.data;

    // Убираем "часики"
    await bot.answerCallbackQuery(query.id);

    if (data === "send_id") {
      // 1) ищем гида в БД по telegram_id
      const guide = await findGuideByTelegramId(userId);

      if (!guide) {
        await bot.sendMessage(
          chatId,
          `❌ Гид с вашим Telegram ID не найден.\nЕсли вы ожидаете доступ — свяжитесь с администратором.`
        );
        return;
      }

      // 2) приветствие по имени
      const name = guide.name?.trim();
      await bot.sendMessage(chatId, `Привет, ${name || "гид"}!`);

      // 3) статус подписки
      if (hasActiveSubscription(guide)) {
        const until = guide.subscription_until
          ? formatDateRu(guide.subscription_until)
          : "без даты окончания";

        await bot.sendMessage(
          chatId,
          `✅ Твоя подписка активна до: ${until}`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📥 Просмотреть заявки", callback_data: "view_requests" }],
              ],
            },
          }
        );
      } else {
        await bot.sendMessage(
          chatId,
          `⚠️ Упс, подписка неактивна.\nОбратитесь к администратору, чтобы продлить доступ.`
        );
      }
      return;
    }

    if (data === "view_requests") {
      // Здесь можно открыть веб-страницу с заявками или вывести список из БД.
      // Пока даём ссылку в вашу админку/веб-приложение (при необходимости замените URL):
      const base = process.env.APP_BASE_URL || "https://newsproject-tnkc.onrender.com";
      const url = `${base}/guides/requests`; // при желании сделайте deep-link под ваш роут
      await bot.sendMessage(
        chatId,
        `Открыть заявки: ${url}`
      );
      return;
    }
  } catch (e) {
    console.error("[telegram] callback_query error:", e);
    const chatId = query?.message?.chat?.id;
    if (chatId) {
      await bot.sendMessage(chatId, "Упс, что-то пошло не так. Попробуйте позже.");
    }
  }
});
