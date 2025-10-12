// --- CONTENT API (Hero + Article for each category page) ---

import express from "express";
import { Pool } from "pg";

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/* ============================================================
   GET /page/:slug
   Возвращает данные страницы (hero + контент)
   ============================================================ */
app.get("/page/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const categoryQuery = pool.query(
      `SELECT id, slug, label, title, subtitle, cover_url, description
       FROM categories
       WHERE slug=$1 AND is_active=true
       LIMIT 1`,
      [slug]
    );

    const articleQuery = pool.query(
      `SELECT id, status, seo_meta_title, seo_meta_description,
              cover_image_url, content_json, updated_at
       FROM articles
       WHERE type='category_page'
         AND category_slug=$1
         AND status='published'
       LIMIT 1`,
      [slug]
    );

    const [catRes, artRes] = await Promise.all([categoryQuery, articleQuery]);
    const category = catRes.rows[0];
    if (!category) return res.status(404).json({ error: "category_not_found" });

    const article = artRes.rows[0] || { content_json: [] };
    return res.json({ category, article });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed_to_fetch_page" });
  }
});

/* ============================================================
   PATCH /categories/:id
   Обновление hero-блока (заголовок, подзаголовок, фон и т.д.)
   ============================================================ */
app.patch("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, cover_url, label, order_index, is_active } =
      req.body || {};

    const { rows } = await pool.query(
      `UPDATE categories
       SET title = COALESCE($1, title),
           subtitle = COALESCE($2, subtitle),
           cover_url = COALESCE($3, cover_url),
           label = COALESCE($4, label),
           order_index = COALESCE($5, order_index),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id=$7
       RETURNING id, slug, label, title, subtitle, cover_url, order_index, is_active`,
      [
        title ?? null,
        subtitle ?? null,
        cover_url ?? null,
        label ?? null,
        order_index ?? null,
        is_active ?? null,
        id,
      ]
    );

    if (!rows[0]) return res.status(404).json({ error: "category_not_found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed_to_update_category" });
  }
});

/* ============================================================
   PUT /category-page/:slug
   Создать или обновить контент страницы категории (upsert)
   ============================================================ */
app.put("/category-page/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      content_json = [],
      status = "draft",
      seo_meta_title = null,
      seo_meta_description = null,
      cover_image_url = null,
      title = null,
      excerpt = null,
    } = req.body || {};

    // Проверяем, существует ли категория
    const cat = await pool.query(
      "SELECT 1 FROM categories WHERE slug=$1 AND is_active=true",
      [slug]
    );
    if (!cat.rows[0])
      return res.status(404).json({ error: "category_not_found" });

    // Upsert (insert/update)
    const upsert = await pool.query(
      `INSERT INTO articles (
         type, category_slug, status,
         content_json, seo_meta_title, seo_meta_description,
         cover_image_url, title, excerpt
       )
       VALUES ('category_page', $1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (category_slug)
       WHERE articles.type='category_page'
       DO UPDATE SET
         status = EXCLUDED.status,
         content_json = EXCLUDED.content_json,
         seo_meta_title = EXCLUDED.seo_meta_title,
         seo_meta_description = EXCLUDED.seo_meta_description,
         cover_image_url = EXCLUDED.cover_image_url,
         title = EXCLUDED.title,
         excerpt = EXCLUDED.excerpt,
         updated_at = NOW()
       RETURNING *`,
      [
        slug,
        status,
        content_json,
        seo_meta_title,
        seo_meta_description,
        cover_image_url,
        title,
        excerpt,
      ]
    );

    res.json(upsert.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed_to_upsert_category_page" });
  }
});

/* ============================================================
   GET /categories
   Вернуть список всех категорий (для админки)
   ============================================================ */
app.get("/categories", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM categories ORDER BY order_index, label"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed_to_fetch_categories" });
  }
});

/* ============================================================
   (Опционально) GET /articles/by-category/:slug
   Если нужно получить только статью без hero
   ============================================================ */
app.get("/articles/by-category/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM articles
       WHERE type='category_page' AND category_slug=$1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [slug]
    );
    if (!rows[0])
      return res.status(404).json({ error: "category_page_not_found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed_to_fetch_category_page" });
  }
});

export default app;
