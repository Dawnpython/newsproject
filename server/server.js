// server.js

import "./telegram.js";


import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("❌ Missing DATABASE_URL env var. Set it in Render → Environment.");
  process.exit(1);
}

const app = express();
const allowedOrigin = process.env.FRONTEND_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// ==== DB ====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
});

async function dbQuery(text, params) {
  const res = await pool.query(text, params);
  return res;
}

async function initDb() {
  await dbQuery(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT        NOT NULL,
      email         TEXT        NOT NULL UNIQUE,
      phone         TEXT        UNIQUE,
      password_hash TEXT        NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users ((lower(email)));`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);`);
  await dbQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;`);

  // guides: добавляем отсутствующие поля безопасно
  await dbQuery(`DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='guides') THEN
      ALTER TABLE guides ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE guides ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE guides ADD COLUMN IF NOT EXISTS avatar_public_id TEXT;
    END IF;
  END $$;`);
}

// ==== utils ====
function isEmailValid(email) {
  if (!email) return false;
  if (/\s/.test(email)) return false;
  return email.includes("@");
}
function onlyDigits(s) {
  return String(s || "").replace(/\D/g, "");
}
function signToken(uid) {
  return jwt.sign({ uid }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}
function authMiddleware(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "NO_TOKEN" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { uid }
    return next();
  } catch {
    return res.status(401).json({ error: "TOKEN_INVALID" });
  }
}

// ==== routes ====
// root
app.get("/", (req, res) => {
  res.type("text").send("Auth API is running. Try /api/health");
});
app.get("/api/health", (_, res) => res.json({ ok: true }));

// регистрация
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password, password2 } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: "NAME_REQUIRED" });
    if (!email?.trim() || !isEmailValid(email))
      return res.status(400).json({ error: "EMAIL_INVALID" });

    const phoneDigits = phone ? onlyDigits(phone) : null;
    if (phone && phoneDigits.length === 0)
      return res.status(400).json({ error: "PHONE_INVALID" });

    if (!password) return res.status(400).json({ error: "PASSWORD_REQUIRED" });
    if (password !== password2)
      return res.status(400).json({ error: "PASSWORDS_NOT_MATCH" });

    const exists = await dbQuery(
      `SELECT 1 FROM users
       WHERE lower(email)=lower($1)
          OR ($2::text IS NOT NULL AND phone = $2::text)`,
      [email, phoneDigits]
    );
    if (exists.rowCount > 0) return res.status(409).json({ error: "USER_EXISTS" });

    const hash = await bcrypt.hash(password, 10);
    const insert = await dbQuery(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1, lower($2), $3::text, $4)
       RETURNING id, name, email, phone, created_at, is_admin`,
      [name.trim(), email.trim(), phoneDigits, hash]
    );

    const user = insert.rows[0];
    const token = signToken(user.id);
    return res.status(201).json({ token, user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// логин
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email?.trim() || !isEmailValid(email))
      return res.status(400).json({ error: "EMAIL_INVALID" });
    if (!password) return res.status(400).json({ error: "PASSWORD_REQUIRED" });

    const r = await dbQuery(
      `SELECT id, name, email, phone, password_hash, is_admin
       FROM users
       WHERE lower(email)=lower($1)`,
      [email.trim()]
    );
    if (r.rowCount === 0) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const token = signToken(user.id);
    delete user.password_hash;
    return res.json({ token, user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// текущий пользователь
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const { uid } = req.user;
    const r = await dbQuery(
      `SELECT id, name, email, phone, created_at, is_admin
       FROM users
       WHERE id=$1`,
      [uid]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json({ user: r.rows[0] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "SERVER_ERROR" });
  }
});

const ALLOWED_CATEGORIES = ["boats","taxi","guides","hotels","rent","locals"];

// мои активные заявки
app.get("/api/requests", authMiddleware, async (req, res) => {
  const { uid } = req.user;
  const r = await dbQuery(
    `SELECT id, short_code, text, categories, status, created_at
       FROM requests
      WHERE user_id=$1 AND status='active'
      ORDER BY created_at DESC`,
    [uid]
  );
  res.json({ requests: r.rows });
});

// создать заявку
app.post("/api/requests", authMiddleware, async (req, res) => {
  const { uid } = req.user;
  let { text, categories } = req.body || {};
  text = (text || "").trim();
  if (!text) return res.status(400).json({ error: "TEXT_REQUIRED" });
  if (!Array.isArray(categories) || categories.length === 0)
    return res.status(400).json({ error: "CATEGORIES_REQUIRED" });

  categories = categories.filter(c => ALLOWED_CATEGORIES.includes(String(c)));
  if (categories.length === 0) return res.status(400).json({ error: "CATEGORY_INVALID" });

  const r = await dbQuery(
    `INSERT INTO requests (user_id, text, categories)
     VALUES ($1, $2, $3)
     RETURNING id, short_code, text, categories, status, created_at`,
    [uid, text, categories]
  );
  res.status(201).json({ request: r.rows[0] });
});

// отменить заявку
app.patch("/api/requests/:id/cancel", authMiddleware, async (req, res) => {
  const { uid } = req.user;
  const { id } = req.params;
  const r = await dbQuery(
    `UPDATE requests SET status='canceled', canceled_at=now(), updated_at=now()
      WHERE id=$1 AND user_id=$2 AND status='active' RETURNING id`,
    [id, uid]
  );
  if (r.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND_OR_ALREADY_CANCELED" });
  res.json({ ok: true });
});

// ===== adminOnly =====
async function adminOnly(req, res, next) {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: "NO_TOKEN" });
    const r = await dbQuery(`SELECT is_admin FROM users WHERE id=$1`, [req.user.uid]);
    if (r.rowCount === 0) return res.status(401).json({ error: "UNKNOWN_USER" });
    if (!r.rows[0].is_admin) return res.status(403).json({ error: "FORBIDDEN" });
    next();
  } catch (e) {
    console.error("adminOnly error:", e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
}

// ===== Cloudinary: подписанная загрузка =====
app.post("/api/uploads/signature", authMiddleware, adminOnly, async (_req, res) => {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "guides/avatars";

    // Параметры для подписи: сортировка и точная строка важны
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + process.env.CLOUDINARY_API_SECRET)
      .digest("hex");

    res.json({
      timestamp,
      signature,
      folder,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (e) {
    console.error("signature error:", e);
    res.status(500).json({ error: "SIGNATURE_FAILED" });
  }
});

// ===== Admin: guides list =====
app.get("/api/admin/guides", authMiddleware, adminOnly, async (_req, res) => {
  const r = await dbQuery(
    `SELECT id, name, phone, telegram_username, telegram_id, is_active, categories, subscription_until, description, avatar_url, avatar_public_id, created_at, updated_at
     FROM guides
     ORDER BY created_at DESC`
  );
  res.json({ guides: r.rows });
});

// ===== Admin: update guide =====
app.patch("/api/admin/guides/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, subscription_until, categories, description, avatar_url, avatar_public_id } = req.body || {};

    const fields = [];
    const values = [];
    let i = 1;

    if (typeof is_active === "boolean") {
      fields.push(`is_active = $${i++}`);
      values.push(is_active);
    }
    if (typeof subscription_until !== "undefined") {
      fields.push(`subscription_until = $${i++}`);
      values.push(subscription_until ?? null);
    }
    if (Array.isArray(categories)) {
      fields.push(`categories = $${i++}::text[]`);
      values.push(categories);
    }
    if (typeof description !== "undefined") {
      fields.push(`description = $${i++}`);
      values.push(description ?? null);
    }
    if (typeof avatar_url !== "undefined") {
      fields.push(`avatar_url = $${i++}`);
      values.push(avatar_url ?? null);
    }
    if (typeof avatar_public_id !== "undefined") {
      fields.push(`avatar_public_id = $${i++}`);
      values.push(avatar_public_id ?? null);
    }

    fields.push(`updated_at = now()`);

    if (fields.length === 1) {
      return res.status(400).json({ error: "NOTHING_TO_UPDATE" });
    }

    values.push(id);
    const r = await dbQuery(
      `UPDATE guides SET ${fields.join(", ")} WHERE id = $${i}
       RETURNING id, name, phone, telegram_username, telegram_id, is_active, categories, subscription_until, description, avatar_url, avatar_public_id, created_at, updated_at`,
      values
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ guide: r.rows[0] });
  } catch (e) {
    console.error("PATCH /api/admin/guides/:id error:", e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// ===== Admin: create guide =====
app.post("/api/admin/guides", authMiddleware, adminOnly, async (req, res) => {
  const {
    name,
    phone,
    telegram_username,
    telegram_id,
    is_active = true,
    categories = [],
    subscription_until = null,
    description = null,
    avatar_url = null,
    avatar_public_id = null,
  } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: "NAME_REQUIRED" });
  const r = await dbQuery(
    `INSERT INTO guides (name, phone, telegram_username, telegram_id, is_active, categories, subscription_until, description, avatar_url, avatar_public_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, name, phone, telegram_username, telegram_id, is_active, categories, subscription_until, description, avatar_url, avatar_public_id, created_at, updated_at`,
    [name.trim(), phone || null, telegram_username || null, telegram_id || null, is_active, categories, subscription_until, description, avatar_url, avatar_public_id]
  );
  res.status(201).json({ guide: r.rows[0] });
});



const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8314275448:AAG6bC-5ms-EsOZyaQ2LozKoyQkSS5gOQhs";
const BOT_PATH  = `/bot${BOT_TOKEN}`;

// Telegram шлёт JSON — express.json() уже подключён выше, всё норм
app.post(BOT_PATH, (req, res) => {
  try {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (e) {
    console.error("[webhook] processUpdate error:", e);
    res.sendStatus(500);
  }
});

// получить все отклики по заявке
app.get("/api/requests/:id/responses", authMiddleware, async (req, res) => {
  try {
    const { uid } = req.user;
    const { id } = req.params;

    // проверяем, что заявка принадлежит пользователю
    const rq = await dbQuery(
      `SELECT id FROM requests WHERE id=$1 AND user_id=$2`,
      [id, uid]
    );
    if (rq.rowCount === 0) {
      return res.status(404).json({ error: "REQUEST_NOT_FOUND" });
    }

    // получаем отклики из request_responses
    const q = await dbQuery(
      `SELECT
         rr.id,
         rr.text,
         rr.status,
         rr.price_amount,
         rr.price_currency,
         rr.created_at,
         jsonb_build_object(
           'id', g.id,
           'name', g.name,
           'phone', g.phone,
           'telegram_username', g.telegram_username,
           'telegram_id', g.telegram_id,
           'avatar_url', g.avatar_url,
           'description', NULLIF(g.description, '')
         ) AS guide
       FROM request_responses rr
       JOIN guides g ON g.id = rr.guide_id
       WHERE rr.request_id = $1
       ORDER BY rr.created_at DESC`,
      [id]
    );

    res.json({ responses: q.rows });
  } catch (e) {
    console.error("GET /api/requests/:id/responses error:", e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});


// профиль гида
app.get("/api/guides/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await dbQuery(
      `SELECT id, name, phone, telegram_username, telegram_id, avatar_url,NULLIF(description, '') AS description
       FROM guides WHERE id=$1`,
      [id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ guide: r.rows[0] });
  } catch (e) {
    console.error("GET /api/guides/:id error:", e);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});




// ==== start ====
(async () => {
  try {
    await initDb();
    const port = process.env.PORT || 4000;
    app.listen(port, () => console.log(`API listening on :${port}`));
  } catch (e) {
    console.error("Failed to init:", e);
    process.exit(1);
  }
})();
