// category.js
import { Router } from "express";

/** Регистрирует эндпоинты категорий/страниц на переданном app */
export default function registerCategoryRoutes(app, pool) {
  const router = Router();

  // GET /categories — список категорий
  router.get("/categories", async (_req, res) => {
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

  // POST /categories — создать категорию
router.post("/categories", async (req, res) => {
  try {
    let { label, slug, title = null, subtitle = null, cover_url = null, order_index = 0, is_active = true } = req.body || {};
    label = (label || "").trim();
    slug  = (slug  || "").trim().toLowerCase();

    if (!label) return res.status(400).json({ error: "LABEL_REQUIRED" });
    if (!slug)  return res.status(400).json({ error: "SLUG_REQUIRED" });

    // уникальность slug
    const exists = await pool.query(`SELECT 1 FROM categories WHERE slug=$1`, [slug]);
    if (exists.rowCount > 0) return res.status(409).json({ error: "SLUG_EXISTS" });

    const ins = await pool.query(
      `INSERT INTO categories (slug, label, title, subtitle, cover_url, order_index, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, now(), now())
       RETURNING id, slug, label, title, subtitle, cover_url, order_index, is_active`,
      [slug, label, title || label, subtitle, cover_url, order_index, !!is_active]
    );

    return res.status(201).json(ins.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "failed_to_create_category" });
  }
});


  // GET /page/:slug — hero + контент статьи (published)
  router.get("/page/:slug", async (req, res) => {
    try {
      const { slug } = req.params;

      const [catRes, artRes] = await Promise.all([
        pool.query(
          `SELECT id, slug, label, title, subtitle, cover_url, description
           FROM categories
           WHERE slug=$1 AND is_active=true
           LIMIT 1`,
          [slug]
        ),
        pool.query(
          `SELECT id, status, seo_meta_title, seo_meta_description,
                  cover_image_url, content_json, updated_at
           FROM articles
           WHERE type='category_page' AND category_slug=$1 AND status='published'
           LIMIT 1`,
          [slug]
        ),
      ]);

      const category = catRes.rows[0];
      if (!category)
        return res.status(404).json({ error: "category_not_found" });

      const article = artRes.rows[0] || { content_json: [] };
      res.json({ category, article });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "failed_to_fetch_page" });
    }
  });

  // PATCH /categories/:id — обновить hero
  router.patch("/categories/:id", async (req, res) => {
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

      if (!rows[0])
        return res.status(404).json({ error: "category_not_found" });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "failed_to_update_category" });
    }
  });

  
// PUT /category-page/:slug — upsert контента страницы
router.put("/category-page/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    let {
      content_json = [],
      status = "draft",
      seo_meta_title = null,
      seo_meta_description = null,
      cover_image_url = null,
      title = null,
      excerpt = null,
    } = req.body || {};

    // 1) Нормализуем content_json в JS-массив блоков
    if (typeof content_json === "string") {
      try {
        content_json = JSON.parse(content_json);
      } catch {
        return res.status(400).json({
          error: "invalid_content_json",
          details: "content_json must be valid JSON (array of blocks)",
        });
      }
    }
    if (!Array.isArray(content_json)) {
      // всегда храним список блоков
      content_json = [];
    }

    // 2) Категория существует и активна?
    const cat = await pool.query(
      "SELECT 1 FROM categories WHERE slug=$1 AND is_active=true",
      [slug]
    );
    if (!cat.rows[0]) return res.status(404).json({ error: "category_not_found" });

    // 3) Готовим параметр для jsonb
    const contentJsonParam = JSON.stringify(content_json);

    // 4) Upsert
    const { rows } = await pool.query(
      `INSERT INTO articles (
         type, category_slug, status, content_json,
         seo_meta_title, seo_meta_description,
         cover_image_url, title, excerpt
       )
       VALUES ('category_page', $1, $2, $3::jsonb, $4, $5, $6, $7, $8)
       ON CONFLICT (type, category_slug)
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
      [slug, status, contentJsonParam, seo_meta_title, seo_meta_description, cover_image_url, title, excerpt]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed_to_upsert_category_page" });
  }
});



  app.use("/", router);
}
