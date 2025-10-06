// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.error("❌ Missing DATABASE_URL env var. Set it in Render → Environment.");
  process.exit(1);
}

const app = express();

// CORS: разрешаем фронт с домена из env, иначе * (можно оставить как есть)
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
  // расширение для gen_random_uuid()
  await dbQuery(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  // таблица пользователей
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
  // полезные индексы
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users ((lower(email)));`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone);`);
}

// ==== utils ====
function isEmailValid(email) {
  if (!email) return false;
  if (/\s/.test(email)) return false;
  return email.includes("@"); // как просили: главное, чтобы была @ и не было пробелов
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

// root — чтобы не видеть "Cannot GET /"
app.get("/", (req, res) => {
  res.type("text").send("Auth API is running. Try /api/health");
});

// health
app.get("/api/health", (_, res) => res.json({ ok: true }));

// регистрация
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password, password2 } = req.body || {};

    if (!name?.trim()) return res.status(400).json({ error: "NAME_REQUIRED" });
    if (!email?.trim() || !isEmailValid(email))
      return res.status(400).json({ error: "EMAIL_INVALID" });

    const phoneDigits = phone ? onlyDigits(phone) : null; // телефон храним цифрами
    if (phone && phoneDigits.length === 0)
      return res.status(400).json({ error: "PHONE_INVALID" });

    if (!password) return res.status(400).json({ error: "PASSWORD_REQUIRED" });
    if (password !== password2)
      return res.status(400).json({ error: "PASSWORDS_NOT_MATCH" });

    // проверка уникальности (фикс 42P08 — кастим ко text)
    const exists = await dbQuery(
      `SELECT 1
         FROM users
        WHERE lower(email)=lower($1)
           OR ($2::text IS NOT NULL AND phone = $2::text)`,
      [email, phoneDigits]
    );
    if (exists.rowCount > 0) return res.status(409).json({ error: "USER_EXISTS" });

    const hash = await bcrypt.hash(password, 10);
    const insert = await dbQuery(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1, lower($2), $3::text, $4)
       RETURNING id, name, email, phone, created_at`,
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
      `SELECT id, name, email, phone, password_hash FROM users WHERE lower(email)=lower($1)`,
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

// получить текущего пользователя по токену
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const { uid } = req.user;
    const r = await dbQuery(
      `SELECT id, name, email, phone, created_at FROM users WHERE id=$1`,
      [uid]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json({ user: r.rows[0] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "SERVER_ERROR" });
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
