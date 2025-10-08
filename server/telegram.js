// telegram.js
import TelegramBot from "node-telegram-bot-api";
import pg from "pg";

const { Pool } = pg;

/* ======================= DB ======================= */
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

/* ======================= BOT INSTANCE ======================= */
const token =
  process.env.TELEGRAM_BOT_TOKEN ||
  "8314275448:AAG6bC-5ms-EsOZyaQ2LozKoyQkSS5gOQhs";
export const bot = new TelegramBot(token, { polling: false });

/* ======================= STARTUP (webhook prod / polling dev) ======================= */
(async () => {
  try {
    const useWebhook = process.env.USE_WEBHOOK === "true";
    if (useWebhook) {
      const baseUrl = process.env.BASE_URL;
      if (!baseUrl) throw new Error("BASE_URL is required when USE_WEBHOOK=true");

      const path = `/bot${token}`; // уникальный путь (желательно спрятать токен в реале)
      const url = `${baseUrl}${path}`;

      // В твоём Express-сервере должен быть:
      // app.post(path, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200); });

      await bot.setWebHook(url, { drop_pending_updates: true });
      console.log("[bot] Webhook set:", url);
    } else {
      await bot.deleteWebHook({ drop_pending_updates: true });
      await bot.startPolling();
      console.log("[bot] Polling started");
    }
  } catch (e) {
    console.error("[bot] start error:", e);
  }
})();

/* ======================= UTILS ======================= */
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

function hasActiveSubscription(guide) {
  const flag = !!guide.is_active;
  const until = guide.subscription_until ? new Date(guide.subscription_until) : null;
  const today = new Date();
  const dateOk = !until || until >= today;
  return flag && dateOk;
}

/* ----- Дедуп кликов по инлайн-кнопкам ----- */
const recentCallbacks = new Map(); // key -> timestamp
function isDuplicateCallback(key, windowMs = 3000) {
  const now = Date.now();
  const last = recentCallbacks.get(key) || 0;
  if (now - last < windowMs) return true;
  recentCallbacks.set(key, now);
  // простая очистка кэша
  if (recentCallbacks.size > 500) {
    const cutoff = now - windowMs;
    for (const [k, t] of recentCallbacks) if (t < cutoff) recentCallbacks.delete(k);
  }
  return false;
}

/* ======================= SCENARIO ======================= */
// /start — приветствие -> проверяем, гид ли пользователь
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  // 1) Приветствие
  await bot.sendMessage(chatId, `Привет, я бот гидов.`);

  // 2) Проверка, является ли пользователь гидом
  try {
    const guide = await findGuideByTelegramId(userId);

    if (!guide) {
      await bot.sendMessage(chatId, `К сожалению, вы не гид :(`);
      return;
    }

    // Нашли гида — предлагаем проверить подписку
    await bot.sendMessage(chatId, `Привет, ${guide.name?.trim() || "гид"}!`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Проверить подписку", callback_data: "check_sub" }],
        ],
      },
    });
  } catch (e) {
    console.error("[/start] findGuide error:", e);
    await bot.sendMessage(chatId, "Упс, что-то пошло не так. Попробуйте позже.");
  }
});

/* ----- Обработка инлайн-кнопок ----- */
bot.on("callback_query", async (query) => {
  try {
    if (!query?.data) return;

    const chatId = query.message?.chat?.id;
    const userId = query.from?.id;
    const msgId = query.message?.message_id;
    const data = query.data;

    // Дедуп по сообщению + действию + пользователю
    const dedupKey = `${msgId}:${userId}:${data}`;
    if (isDuplicateCallback(dedupKey)) {
      await bot.answerCallbackQuery(query.id);
      return;
    }

    // Всегда отвечаем, чтобы убрать "часики"
    await bot.answerCallbackQuery(query.id);

    if (data === "check_sub") {
      const guide = await findGuideByTelegramId(userId);

      if (!guide) {
        await bot.sendMessage(chatId, `К сожалению, вы не гид :(`);
        return;
      }

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
          `⚠️ Подписка не активна.\nОбратитесь к администратору, чтобы продлить доступ.`
        );
      }
      return;
    }

    if (data === "view_requests") {
      // Сразу убираем клавиатуру, чтобы исключить повторные клики
      try {
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatId, message_id: msgId }
        );
      } catch {
        /* уже отредактировано — ок */
      }

      const base = process.env.APP_BASE_URL || "https://newsproject-tnkc.onrender.com";
      const url = `${base}/guides/requests`;
      await bot.sendMessage(chatId, `Открыть заявки: ${url}`);
      return;
    }
  } catch (e) {
    console.error("[callback_query] error:", e);
    const chatId = query?.message?.chat?.id;
    if (chatId) {
      await bot.sendMessage(chatId, "Упс, что-то пошло не так. Попробуйте позже.");
    }
  }
});
