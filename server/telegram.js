// telegram.js
import TelegramBot from "node-telegram-bot-api";
import pg from "pg";

const { Pool, Client } = pg;

/* ======================= DB (Pool) ======================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
});

/* ===== helpers to query ===== */
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
 * Выборка активных заявок по категориям гида (requests.categories text[])
 * Скрываем заявки, по которым у этого гида уже есть запись в request_responses
 */
async function fetchRequestsForCategories(guideCategories = [], limit = 5, offset = 0, guideId = null) {
  if (!guideCategories?.length) return { items: [], total: 0 };

  const r = await pool.query(
    `
    WITH filtered AS (
      SELECT r.id, r.short_code, r.text, r.categories, r.created_at
        FROM requests r
       WHERE r.status = 'active'
         AND r.categories && $1::text[]
         AND (
           $4::int IS NULL
           OR NOT EXISTS (
             SELECT 1
               FROM request_responses rr
              WHERE rr.request_id = r.id
                AND rr.guide_id = $4
           )
         )
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
    [guideCategories, limit, offset, guideId]
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

/* ===== Ответы/сообщения ===== */

// Создаём/обновляем оффер гида + первое сообщение (user_id проставляем явно из заявки)
async function createGuideResponse({ requestId, guideId, text }) {
  // Проверка: заявка активна + возьмём владельца
  const rq = await pool.query(
    `SELECT id, status, user_id FROM requests WHERE id=$1`,
    [requestId]
  );
  if (rq.rowCount === 0) throw new Error("REQUEST_NOT_FOUND");
  if (rq.rows[0].status !== 'active') throw new Error("REQUEST_NOT_ACTIVE");
  const userIdOfRequest = rq.rows[0].user_id;

  // Upsert ответа с user_id
  const upsert = await pool.query(
    `
    INSERT INTO request_responses (request_id, guide_id, user_id, status, text)
    VALUES ($1, $2, $3, 'sent', $4)
    ON CONFLICT (request_id, guide_id)
    DO UPDATE SET status='sent', text=EXCLUDED.text, updated_at=now()
    RETURNING id
    `,
    [requestId, guideId, userIdOfRequest, text]
  );
  const responseId = upsert.rows[0].id;

  // Первое сообщение в тред
  await pool.query(
    `INSERT INTO request_messages (response_id, sender_type, sender_id, text)
     VALUES ($1, $2, $3, $4)`,
    [responseId, 'guide', guideId, text]
  );

  return responseId;
}

// Отказать по заявке (user_id проставляем явно)
async function rejectGuideResponse({ requestId, guideId, reason = null }) {
  const rq = await pool.query(
    `SELECT id, status, user_id FROM requests WHERE id=$1`,
    [requestId]
  );
  if (rq.rowCount === 0) throw new Error("REQUEST_NOT_FOUND");
  const userIdOfRequest = rq.rows[0].user_id;

  const upsert = await pool.query(
    `
    INSERT INTO request_responses (request_id, guide_id, user_id, status, text)
    VALUES ($1, $2, $3, 'rejected', $4)
    ON CONFLICT (request_id, guide_id)
    DO UPDATE SET status='rejected', text=COALESCE(request_responses.text, EXCLUDED.text), updated_at=now()
    RETURNING id
    `,
    [requestId, guideId, userIdOfRequest, reason]
  );
  const responseId = upsert.rows[0].id;

  if (reason) {
    await pool.query(
      `INSERT INTO request_messages (response_id, sender_type, sender_id, text)
       VALUES ($1, $2, $3, $4)`,
      [responseId, 'guide', guideId, `(отклонено) ${reason}`]
    );
  }
  return responseId;
}

/* ======================= BOT INSTANCE ======================= */
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}
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

/* ===== Состояние ожидания текста ответа ===== */
const pendingReplyByUser = new Map(); // telegram userId -> { requestId, guideId }

/* ======================= SCENARIO ======================= */
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

bot.onText(/^\/requests$/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;

  const guide = await findGuideByTelegramId(userId);
  if (!guide) return bot.sendMessage(chatId, `К сожалению, вы не гид :(`);
  if (!hasActiveSubscription(guide)) return bot.sendMessage(chatId, `⚠️ Подписка не активна.`);

  // Показ первой заявки (индекс 0)
  await sendRequestItem(chatId, guide, 0);
});

bot.on("callback_query", async (query) => {
  try {
    if (!query?.data) return;

    const chatId = query.message?.chat?.id;
    const userId = query.from?.id;
    const msgId  = query.message?.message_id;
    const data   = query.data;

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
      // data формат: view_requests:<index>
      let index = 0;
      const parts = data.split(":");
      if (parts.length > 1) index = parseInt(parts[1] || "0", 10) || 0;

      const guide = await findGuideByTelegramId(userId);
      if (!guide) return bot.sendMessage(chatId, `К сожалению, вы не гид :(`);
      if (!hasActiveSubscription(guide)) return bot.sendMessage(chatId, `⚠️ Подписка не активна.`);

      // Перерисуем текущим сообщением
      await sendRequestItem(chatId, guide, index, { editMessageId: msgId });
      return;
    }

    if (data.startsWith("reply:")) {
      const requestId = data.split(":")[1];
      const guide = await findGuideByTelegramId(userId);
      if (!guide) return bot.sendMessage(chatId, `К сожалению, вы не гид :(`);
      if (!hasActiveSubscription(guide)) return bot.sendMessage(chatId, `⚠️ Подписка не активна.`);

      pendingReplyByUser.set(userId, { requestId, guideId: guide.id });
      await bot.sendMessage(chatId, "Напишите текст вашего ответа на эту заявку одним сообщением:",CANCEL_KB);
      return;
    }

    if (data.startsWith("reject:")) {
      const requestId = data.split(":")[1];
      const guide = await findGuideByTelegramId(userId);
      if (!guide) return bot.sendMessage(chatId, `К сожалению, вы не гид :(`);
      if (!hasActiveSubscription(guide)) return bot.sendMessage(chatId, `⚠️ Подписка не активна.`);

      try {
        await rejectGuideResponse({ requestId, guideId: guide.id });
        await bot.sendMessage(chatId, "Заявка отмечена как отклонённая для вас.");
      } catch (e) {
        console.error("[reject] error:", e);
        await bot.sendMessage(chatId, `Не удалось отклонить: ${e.message || "ошибка"}`);
      }
      return;
    }
  } catch (e) {
    console.error("[callback_query] error:", e);
    const chatId = query?.message?.chat?.id;
    if (chatId) await bot.sendMessage(chatId, "Упс, что-то пошло не так. Попробуйте позже.");
  }
});

/* Принятие текстового ответа от гида */
const CANCEL_TEXT = "Отмена";
const CANCEL_KB = {
  reply_markup: {
    keyboard: [[{ text: CANCEL_TEXT }]],
    resize_keyboard: true,
    one_time_keyboard: true, // свернётся после нажатия
  },
};
const REMOVE_KB = { reply_markup: { remove_keyboard: true } };

bot.on("message", async (msg) => {
  // игнор команд
  if (!msg.text || msg.text.startsWith("/")) return;

  const userId = msg.from?.id;
  const chatId = msg.chat?.id;

  const pending = pendingReplyByUser.get(userId);
  if (!pending) return;

  const text = msg.text.trim();

  // 1) Обработка отмены
  if (text.toLowerCase() === CANCEL_TEXT.toLowerCase()) {
    await bot.sendMessage(chatId, "Ок, отменил. Ничего не отправляю.", REMOVE_KB);
    pendingReplyByUser.delete(userId);
    return;
  }

  // 2) Пустой ответ — просим ввести текст и показываем кнопку Отмена
  if (!text) {
    await bot.sendMessage(
      chatId,
      "Пустой ответ не отправлен. Напишите текст и попробуйте снова или нажмите «Отмена».",
      CANCEL_KB
    );
    return;
  }

  // 3) Обычная отправка ответа
  const { requestId, guideId } = pending;
  try {
    await createGuideResponse({ requestId, guideId, text });
    await bot.sendMessage(chatId, "Спасибо! Ваш ответ отправлен пользователю.", REMOVE_KB);
  } catch (e) {
    console.error("[reply] create error:", e);
    const msgText = e?.message ? String(e.message) : "ошибка";
    await bot.sendMessage(
      chatId,
      `Не удалось сохранить ответ: ${msgText}\nМожете попробовать ещё раз или нажать «Отмена».`,
      CANCEL_KB
    );
    return; // остаёмся в режиме ожидания, чтобы мог повторить или отменить
  } finally {
    // чистим ожидание только при успешной отправке или явной отмене
    pendingReplyByUser.delete(userId);
  }
});


/* ===== Рендер одной заявки с навигацией (◀️ ▶️) ===== */
async function sendRequestItem(chatId, guide, index = 0, opts = {}) {
  const categories = Array.isArray(guide.categories) ? guide.categories : [];
  // тянем ровно 1 заявку на указанной позиции; скрыты те, где уже есть response для этого guide.id
  const { items, total } = await fetchRequestsForCategories(categories, 1, index, guide.id);

  if (!total) {
    const msg = "Пока заявок по вашим категориям нет.";
    if (opts.editMessageId) {
      try { await bot.editMessageText(msg, { chat_id: chatId, message_id: opts.editMessageId }); } catch {}
    } else {
      await bot.sendMessage(chatId, msg);
    }
    return;
  }

  // если индекс вышел за границы — скорректируем и перерисуем
  if (index < 0 || index >= total) {
    const boundedIndex = Math.max(0, Math.min(index, total - 1));
    if (boundedIndex !== index) {
      return sendRequestItem(chatId, guide, boundedIndex, opts);
    }
  }

  if (!items.length) {
    const msg = "Больше заявок нет.";
    if (opts.editMessageId) {
      try { await bot.editMessageText(msg, { chat_id: chatId, message_id: opts.editMessageId }); } catch {}
    } else {
      await bot.sendMessage(chatId, msg);
    }
    return;
  }

  const it = items[0];
  const header = `📋 Заявка ${index + 1} из ${total}`;
  const text = [header, "", formatRequestLine(it)].join("\n");

  const navRow = [];
  if (index > 0) navRow.push({ text: "◀️ Назад", callback_data: `view_requests:${index - 1}` });
  if (index + 1 < total) navRow.push({ text: "▶️ Далее", callback_data: `view_requests:${index + 1}` });

  const actionRow = [
    { text: "✍️ Ответить",  callback_data: `reply:${it.id}` },
    { text: "🚫 Отклонить", callback_data: `reject:${it.id}` },
  ];

  const reply_markup = { inline_keyboard: [actionRow, ...(navRow.length ? [navRow] : [])] };

  if (opts.editMessageId) {
    try {
      await bot.editMessageText(text, { chat_id: chatId, message_id: opts.editMessageId, reply_markup });
    } catch {
      // если редактирование не удалось (например, старое сообщение), просто отправим новое
      await bot.sendMessage(chatId, text, { reply_markup });
    }
  } else {
    await bot.sendMessage(chatId, text, { reply_markup });
  }
}

/* ====== (Старая функция листинга на 5 — оставил для возможного использования) ====== */
async function sendRequestsPage(chatId, guide, offset) {
  const categories = Array.isArray(guide.categories) ? guide.categories : [];
  const pageSize = 5;
  const { items, total } = await fetchRequestsForCategories(categories, pageSize, offset, guide.id);

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

/* ======================= PUSH: LISTEN/NOTIFY ======================= */

// ⚠️ ВАЖНО: отдельный endpoint для LISTEN (session/direct). Если не задан — используем DATABASE_URL.
const LISTEN_URL = process.env.DATABASE_URL_LISTEN || process.env.DATABASE_URL;

// Отдельный persistent-клиент для LISTEN
const listenClient = new Client({
  connectionString: LISTEN_URL,
  ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  keepAlive: true,
});

console.log("[db] LISTEN endpoint:", LISTEN_URL === process.env.DATABASE_URL ? "DATABASE_URL" : "DATABASE_URL_LISTEN");

async function startDbListener() {
  try {
    await listenClient.connect();
    await listenClient.query('LISTEN new_request');
    console.log('[db] LISTEN new_request');

    listenClient.on('notification', async (msg) => {
      if (msg.channel !== 'new_request' || !msg.payload) return;
      try {
        const payload = JSON.parse(msg.payload);
        const requestId = Number(payload.request_id);
        if (!requestId) return;
        console.log('[db] got NOTIFY new_request:', requestId);
        await handleNewRequestPush(requestId);
      } catch (e) {
        console.error('[db] notification parse error:', e, msg.payload);
      }
    });

    listenClient.on('error', (e) => {
      console.error('[db] listen error:', e);
      // Можно добавить реконнект с backoff при желании
    });
  } catch (e) {
    console.error('[db] LISTEN start error:', e);
  }
}
startDbListener();

/* ===== Вспомогательные функции для пушей ===== */
async function getRequestById(requestId) {
  const r = await pool.query(
    `SELECT id, status, categories, text, created_at, short_code
       FROM requests
      WHERE id = $1`,
    [requestId]
  );
  return r.rows[0] || null;
}

async function getEligibleGuidesForRequest(requestId) {
  const q = `
    WITH req AS (
      SELECT id, categories
        FROM requests
       WHERE id = $1 AND status = 'active'
    )
    SELECT g.id, g.name, g.telegram_id, g.is_active, g.subscription_until, g.categories
      FROM guides g
      JOIN req ON TRUE
     WHERE g.telegram_id IS NOT NULL
       AND (g.categories && req.categories)
       AND g.is_active = TRUE
       AND (g.subscription_until IS NULL OR g.subscription_until >= now())
       AND NOT EXISTS (
             SELECT 1 FROM request_responses rr
              WHERE rr.request_id = req.id AND rr.guide_id = g.id
           )
       AND NOT EXISTS (
             SELECT 1 FROM request_notifications rn
              WHERE rn.request_id = req.id AND rn.guide_id = g.id
           )
  `;
  const r = await pool.query(q, [requestId]);
  return r.rows;
}

async function markNotified(requestId, guideId) {
  try {
    await pool.query(
      `INSERT INTO request_notifications (request_id, guide_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [requestId, guideId]
    );
  } catch (e) {
    console.error('[notify] markNotified error:', e);
  }
}

function buildRequestMessageForPush(r) {
  const header = '🆕 Новая заявка';
  return [header, '', formatRequestLine(r)].join('\n');
}

function buildRequestKeyboard(requestId) {
  return {
    inline_keyboard: [[
      { text: "✍️ Ответить",  callback_data: `reply:${requestId}` },
      { text: "🚫 Отклонить", callback_data: `reject:${requestId}` },
    ]],
  };
}

async function handleNewRequestPush(requestId) {
  const r = await getRequestById(requestId);
  if (!r || r.status !== 'active') return;

  const guides = await getEligibleGuidesForRequest(requestId);
  if (!guides.length) return;

  // простая батч-рассылка
  const chunkSize = 20;
  for (let i = 0; i < guides.length; i += chunkSize) {
    const chunk = guides.slice(i, i + chunkSize);
    await Promise.allSettled(
      chunk.map(async (g) => {
        try {
          await bot.sendMessage(g.telegram_id, buildRequestMessageForPush(r), {
            reply_markup: buildRequestKeyboard(r.id),
          });
          await markNotified(requestId, g.id);
        } catch (e) {
          console.error(`[notify] send to guide ${g.id} failed:`, e.message);
        }
      })
    );
    // Пауза между пачками
    await new Promise(res => setTimeout(res, 1000));
  }
}

/* ======================= BACKUP POLLING (страховка по времени) ======================= */
let lastPollTs = null; // Date

async function pollNewRequests() {
  try {
    // окно: либо с прошлого запуска, либо последние 15 минут
    const since = lastPollTs
      ? lastPollTs.toISOString()
      : new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // сразу обновим якорь времени, чтобы не пропускать бёрсты
    lastPollTs = new Date();

    const r = await pool.query(`
      SELECT r.id
        FROM requests r
       WHERE r.status = 'active'
         AND r.created_at >= $1::timestamptz
         AND NOT EXISTS (
               SELECT 1 FROM request_notifications rn
                WHERE rn.request_id = r.id
             )
       ORDER BY r.created_at ASC
       LIMIT 500
    `, [since]);

    for (const row of r.rows) {
      const id = row.id; // uuid
      console.log('[poll] found request_id =', id);
      try {
        await handleNewRequestPush(id);
      } catch (e) {
        console.error('[poll] handleNewRequestPush error for', id, e);
      }
    }
  } catch (e) {
    console.error('[poll] error:', e);
  }
}

setInterval(pollNewRequests, 10_000);
setTimeout(pollNewRequests, 2000);
