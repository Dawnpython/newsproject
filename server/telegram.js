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
 * Заявки по категориям с пагинацией
 * Схема поддерживает r.category (text) И/ИЛИ r.categories (text[])
 * Фильтрация по открытому статусу, если есть поле status.
 */
async function fetchRequestsForCategories(guideCategories = [], limit = 5, offset = 0) {
  if (!guideCategories || guideCategories.length === 0) {
    return { items: [], total: 0 };
  }
  const r = await pool.query(
    `
    WITH filtered AS (
      SELECT r.*
        FROM requests r
       WHERE (
              (r.category   IS NOT NULL AND r.category   = ANY($1))
           OR (r.categories IS NOT NULL AND r.categories && $1::text[])
       )
       AND (r.status IS NULL OR r.status = 'open')
    )
    SELECT
      (SELECT COUNT(*) FROM filtered) AS total,
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', f.id,
            'text', f.text,
            'category', f.category,
            'categories', f.categories,
            'created_at', f.created_at,
            'user_id', f.user_id,
            'short_code', f.short_code,
            'messages_cnt', f.messages_cnt
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
    text: x.text,
    category: x.category,
    categories: x.categories,
    created_at: x.created_at,
    user_id: x.user_id,
    short_code: x.short_code,
    messages_cnt: x.messages_cnt
  }));
  return { items, total };
}

/**
 * Новые заявки с момента "since" (ISO строка/Date) по категориям
 */
async function fetchNewRequestsSince(guideCategories = [], sinceISO) {
  if (!guideCategories?.length || !sinceISO) return [];
  const r = await pool.query(
    `
    SELECT r.id, r.text, r.category, r.categories, r.created_at, r.short_code
      FROM requests r
     WHERE (
            (r.category   IS NOT NULL AND r.category   = ANY($1))
         OR (r.categories IS NOT NULL AND r.categories && $1::text[])
     )
       AND (r.status IS NULL OR r.status = 'open')
       AND r.created_at > $2::timestamptz
     ORDER BY r.created_at DESC
     LIMIT 20
    `,
    [guideCategories, sinceISO]
  );
  return r.rows || [];
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
      // В Express-сервере:
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
function formatDateRu(d) {
  try {
    return new Date(d).toLocaleDateString("ru-RU", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return String(d); }
}
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
  const arr = row.categories || (row.category ? [row.category] : []);
  if (!arr?.length) return "—";
  return arr.map((c) => CATEGORY_LABELS[c] || c).join(", ");
}

function formatRequestLine(r) {
  return [
    `🆔 #${String(r.short_code || r.id).padStart(5, "0")}`,
    `📂 ${labelFromRow(r)}`,
    `🗓 ${formatDateTimeRu(r.created_at)}`,
    r.text ? `✍️ ${r.text}` : null,
  ].filter(Boolean).join("\n");
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
        const until = guide.subscription_until ? formatDateRu(guide.subscription_until) : "без даты окончания";
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

/* ====== Рендер страницы заявок с пагинацией ====== */
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
  await bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: keyboardRow.length ? [keyboardRow] : [] } });
}

/* ======================= (Опционально) Уведомления о новых заявках ======================= */
/**
 * Включить: NOTIFY_REQUESTS=true
 * Простая реализация пуллингом БД раз в N секунд. Для продакшна лучше LISTEN/NOTIFY.
 */
const NOTIFY = process.env.NOTIFY_REQUESTS === "true";
const POLL_MS = Number(process.env.NOTIFY_POLL_MS || 45000);

// в оперативке храним, с какого времени показываем новые
const lastSeenMap = new Map(); // key: guide.id -> ISO string

if (NOTIFY) {
  setInterval(async () => {
    try {
      // Найти активных гидов с категориями
      const gq = await pool.query(
        `SELECT id, telegram_id, name, categories, subscription_until, is_active
           FROM guides
          WHERE (is_active = true)
            AND (categories IS NOT NULL AND array_length(categories, 1) > 0)`
      );

      const guides = gq.rows || [];
      const nowISO = new Date().toISOString();

      for (const g of guides) {
        // Проверка подписки на всякий случай
        if (!hasActiveSubscription(g)) continue;

        const key = String(g.id);
        const since = lastSeenMap.get(key) || new Date(Date.now() - 5 * 60 * 1000).toISOString(); // по умолчанию — последние 5 минут
        const categories = Array.isArray(g.categories) ? g.categories : [];
        if (!categories.length || !g.telegram_id) continue;

        const news = await fetchNewRequestsSince(categories, since);
        if (news.length) {
          const text = [
            `🆕 Новые заявки по вашим категориям:`,
            "",
            news.slice(0, 5).map(formatRequestLine).join("\n\n"),
            news.length > 5 ? `\n…и ещё ${news.length - 5}` : "",
            `\nЧтобы посмотреть список: /requests`,
          ].join("\n");
          try {
            await bot.sendMessage(g.telegram_id, text);
          } catch (e) {
            // если пользователь блокнул бота — молча пропустим
            console.warn(`[notify] send to ${g.telegram_id} failed:`, e?.message);
          }
        }

        // обновляем lastSeen
        lastSeenMap.set(key, nowISO);
      }
    } catch (e) {
      console.error("[notify] interval error:", e);
    }
  }, POLL_MS);
}
