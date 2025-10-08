// telegram.js
import TelegramBot from "node-telegram-bot-api";
import pg from "pg";

const { Pool } = pg;

// --- DB соединение (минимально, без экспорта из server.js)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
});

async function findGuideByTelegramId(telegramId) {
  const r = await pool.query(
    `SELECT id, name, is_active
       FROM guides
      WHERE telegram_id = $1
      LIMIT 1`,
    [telegramId]
  );
  return r.rows[0] || null;
}

const token = process.env.TELEGRAM_BOT_TOKEN || "ТВОЙ_ТОКЕН"; // пока оставляем как у тебя
export const bot = new TelegramBot(token, { polling: true });

// /start — приветствие + кнопка
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    `Привет, ${msg.from.first_name || "друг"} 👋
Я бот платформы гидов.`.trim(),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Проверить подписку", callback_data: "verify_sub" }],
        ],
      },
    }
  );
});

// Обработка нажатия на кнопку
bot.on("callback_query", async (query) => {
  if (!query?.data) return;

  const chatId = query.message?.chat?.id;
  const userId = query.from?.id; // это и есть telegram_id

  if (query.data === "verify_sub") {
    try {
      await bot.answerCallbackQuery(query.id); // чтобы убрать "часики" на кнопке

      // 1) ищем гида в БД
      const guide = await findGuideByTelegramId(userId);

      if (!guide) {
        await bot.sendMessage(
          chatId,
          `❌ Гид с вашим Telegram ID не найден.
Если вы ожидаете доступ — свяжитесь с администратором.`
        );
        return;
      }

      // 2) проверяем статус
      if (guide.is_active) {
        await bot.sendMessage(
          chatId,
          `🎉 Подписка активна!${guide.name ? `\nДобро пожаловать, ${guide.name}.` : ""}`
        );
      } else {
        await bot.sendMessage(
          chatId,
          `⚠️ Подписка не активна.\nОбратитесь к администратору, чтобы продлить доступ.`
        );
      }
    } catch (e) {
      console.error("[telegram] verify_sub error:", e);
      await bot.sendMessage(chatId, "Упс, что-то пошло не так. Попробуйте позже.");
    }
  }
});
