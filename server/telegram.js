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
    `SELECT id, name, is_active, subscription_until, categories
       FROM guides
      WHERE telegram_id = $1
      LIMIT 1`,
    [telegramId]
  );
  return r.rows[0] || null;
}

/**
 * Заявки по категориям гида (строго по массиву categories), только активные
 * Пагинация: limit/offset
 */
async function fetchRequestsForCategories(guideCategories = [], limit = 5, offset = 0) {
  if (!guideCategories?.length) return { items: [], total: 0 };

  const r = await pool.query(
    `
    WITH filtered AS (
      SELECT r.id, r.short_code, r.text, r.categories, r.created_at
        FROM requests r
       WHERE r.status = 'active'
         AND r.categories && $1::text[]   -- пересечение массивов
    )
    SELECT
      (SELECT COUNT(*) FROM filtered) AS total,
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', f.id,
            'short_code', f.short_code,
            'text', f.text,
            'categories', f.categories,
            'created_at', f.created_at
          ) ORDER BY f.created_at DESC
        ), '[]'::jsonb
      ) AS data
    FROM (
      SELECT *
        FROM filtered
       ORDER BY created_at DESC NULLS LAST, id DESC
       LIMIT $2 OFFSET $3
    ) f
    `,
    [guideCategories, limit, offset]
  );

  const row = r.rows[0] || {};
  const total = Number(row.total || 0);
  const items = (row.data || []).map((x) => ({
    id: x.id,
    short_code: x.short_code,
    text: x.text,
    categories: x.categories,
    created_at: x.created_at,
  }));
  return { items, total };
}

/* ======================= BOT INSTANCE ======================= */
const token = process.env.TELEGRAM_BOT_TOKEN || "8314275448:AAG6bC-5ms-EsOZyaQ2LozKoyQkSS5gOQhs";
export const bot = new TelegramBot(token, { polling: false });

/* ======================= STARTUP (webhook prod / polling dev) ======================= */
(async () => {
  try {
    const useWebhook = process.env.USE_WEBHOOK === "true";
    if (useWebhook) {
      const baseUrl = process.env.BASE_URL;
      if (!baseUrl) throw new Error("BASE_URL is required when USE_WEBHOOK=true");
      const path = `/bot${token}`;
      const url = `${baseUrl}${path}`;
      // В Express:
      // app.post(path, (req,res)=>{ bot.processUpdate(req.body); res.sendStatus(200); });
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
function formatDateTimeRu(d) {
  try {
    return new Date(d).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch { return String(d); }
}
function hasActiveSubscription(guide) {
  const flag = !!guide.is_active;
  const until = guide.subscription_until ? new Date(guide.subscription_until) : null;
  const today = new Date();
  const dateOk = !until || until >= today;
  return flag && dateOk;
}
const CATEGORY_LABELS = {
  boats: "Лодки",
  taxi: "Такси",
  guides: "Гиды",
  hotels: "Отели",
  rent: "Аренда жилья",
  locals: "Местные жители",
};
function labelFromRow(row) {
  const arr = row.categories || [];
  if (!arr.length) return "—";
  return arr.map((c) => CATEGORY_LABELS[c] || c).join(", ");
}
function formatRequestLine(r) {
  // короткий и читаемый формат: номер, категории, дата, текст
  const num = String(r.short_code || r.id).padStart(5, "0");
  const cat = labelFromRow(r);
  const dt = formatDateTimeRu(r.created_at);
  const body = (r.text || "").trim();
  return `🆔 #${num}\n📂 ${cat}\n🗓 ${dt}\n✍️ ${body}`;
}

/* ----- Дедуп кликов по инлайн-кнопкам ----- */
const recentCallbacks = new Map(); // key -> timestamp
function isDuplicateCallback(key, windowMs = 3000) {
  const now = Date.now();
  const last = recentCallbacks.get(key) || 0;
  if (now - last < windowMs) return true;
  recentCallbacks.set(key, now);
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

  await bot.sendMessage(chatId, `Привет, я бот гидов.`);

  try {
    const guide = await findGuideByTelegramId(userId);
    if (!guide) {
      await bot.sendMessage(chatId, `К сожалению, вы не гид :(`);
      return;
    }
    await bot.sendMessage(chatId, `Привет, ${guide.name?.trim() || "гид"}!`, {
      reply_markup: { inline_keyboard: [[{ text: "✅ Проверить подписку", callback_data: "check_sub" }]] },
    });
  } catch (e) {
    console.error("[/start] findGuide error:", e);
    await bot.sendMessage(chatId, "Упс, что-то пошло не так. Попробуйте позже.");
  }
});

/* Быстрый вход командой */
bot.onText(/^\/requests$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  const guide = await findGuideByTelegramId(userId);
  if (!guide) return bot.sendMessage(chatId, `К сожалению, вы не гид :(`);
  if (!hasActiveSubscription(guide)) return bot.sendMessage(chatId, `⚠️ Подписка не активна.`);

  await sendRequestsPage(chatId, guide, 0);
});

/* ----- Обработка инлайн-кнопок ----- */
bot.on("callback_query", async (query) => {
  try {
    if (!query?.data) return;

    const chatId = query.message?.chat?.id;
    const userId = query.from?.id;
    const msgId = query.message?.message_id;
    const data = query.data;

    const dedupKey = `${msgId}:${userId}:${data}`;
    if (isDuplicateCallback(dedupKey)) {
      await bot.answerCallbackQuery(query.id);
      return;
    }
    await bot.answerCallbackQuery(query.id);

    if (data === "check_sub") {
      const guide = await findGuideByTelegramId(userId);
      if (!guide) return bot.sendMessage(chatId, `К сожалению, вы не гид :(`);

      if (hasActiveSubscription(guide)) {
        const until = guide.subscription_until
          ? new Date(guide.subscription_until).toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" })
          : "без даты окончания";
        await bot.sendMessage(chatId, `✅ Твоя подписка активна до: ${until}`, {
          reply_markup: { inline_keyboard: [[{ text: "📥 Просмотреть заявки", callback_data: "view_requests:0" }]] },
        });
      } else {
        await bot.sendMessage(chatId, `⚠️ Подписка не активна.\nОбратитесь к администратору, чтобы продлить доступ.`);
      }
      return;
    }

    if (data.startsWith("view_requests")) {
      let offset = 0;
      const parts = data.split(":");
      if (parts.length > 1) offset = parseInt(parts[1] || "0", 10) || 0;

      try { await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: msgId }); } catch {}

      const guide = await findGuideByTelegramId(userId);
      if (!guide) return bot.sendMessage(chatId, `К сожалению, вы не гид :(`);
      if (!hasActiveSubscription(guide)) return bot.sendMessage(chatId, `⚠️ Подписка не активна.`);

      await sendRequestsPage(chatId, guide, offset);
      return;
    }
  } catch (e) {
    console.error("[callback_query] error:", e);
    const chatId = query?.message?.chat?.id;
    if (chatId) await bot.sendMessage(chatId, "Упс, что-то пошло не так. Попробуйте позже.");
  }
});

/* ====== Рендер страницы заявок с пагинацией (чисто текстом) ====== */
async function sendRequestsPage(chatId, guide, offset) {
  const categories = Array.isArray(guide.categories) ? guide.categories : [];
  const pageSize = 5;
  const { items, total } = await fetchRequestsForCategories(categories, pageSize, offset);

  if (!items.length) {
    if (offset === 0) await bot.sendMessage(chatId, "Пока заявок по вашим категориям нет.");
    else await bot.sendMessage(chatId, "Больше заявок нет.");
    return;
  }

  const from = offset + 1;
  const to = offset + items.length;
  const header = `📋 Заявки по вашим категориям (${from}–${to} из ${total}):`;
  const text = [header, "", items.map(formatRequestLine).join("\n\n")].join("\n");

  const keyboardRow = [];
  if (offset > 0) {
    const prevOffset = Math.max(0, offset - pageSize);
    keyboardRow.push({ text: "◀️ Назад", callback_data: `view_requests:${prevOffset}` });
  }
  if (offset + pageSize < total) {
    const nextOffset = offset + pageSize;
    keyboardRow.push({ text: "▶️ Далее", callback_data: `view_requests:${nextOffset}` });
  }

  await bot.sendMessage(chatId, text, {
    reply_markup: { inline_keyboard: keyboardRow.length ? [keyboardRow] : [] },
  });
}
