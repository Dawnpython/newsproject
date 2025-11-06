// popular.js (ESM)
import { Router } from "express";

/**
 * Таблица popular_items:
 * id SERIAL PK,
 * section TEXT NOT NULL,
 * title TEXT NOT NULL,
 * description TEXT,
 * image_url TEXT,
 * image_public_id TEXT,
 * link_type TEXT NOT NULL DEFAULT 'category',
 * link_slug TEXT NOT NULL,
 * sort_order INTEGER NOT NULL DEFAULT 0,
 * created_at TIMESTAMPTZ DEFAULT now(),
 * updated_at TIMESTAMPTZ DEFAULT now()
 */
export default function registerPopularRoutes(app, pool, authMiddleware, adminOnly) {
  const r = Router();

  // GET /popular?section=water
  r.get("/", async (req, res) => {
    try {
      const { section } = req.query;

      if (section) {
        const { rows } = await pool.query(
          `SELECT * FROM popular_items
           WHERE section = $1
           ORDER BY sort_order ASC, id ASC`,
          [section]
        );
        return res.json({ [section]: rows });
      }

      // если секция не указана — отдать все секции сгруппированно
      const { rows } = await pool.query(
        `SELECT * FROM popular_items
         ORDER BY section ASC, sort_order ASC, id ASC`
      );
      const grouped = rows.reduce((acc, it) => {
        (acc[it.section] ||= []).push(it);
        return acc;
      }, {});
      res.json(grouped);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "popular_list_failed" });
    }
  });

  // POST /popular  (admin) — создать карточку
  r.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const {
        section,
        title,
        description,
        image_url,
        image_public_id,
        link_slug, // ссылка всегда на категорию
        sort_order = 0,
      } = req.body || {};

      if (!section || !title || !link_slug) {
        return res.status(400).json({ error: "missing_fields" });
      }

      // проверяем, что нет другого popular_item с таким slug
      const dup = await pool.query(
        `SELECT id FROM popular_items
         WHERE link_type='category' AND link_slug=$1`,
        [link_slug]
      );
      if (dup.rowCount > 0) {
        return res.status(409).json({ error: "slug_taken" });
      }

      const { rows } = await pool.query(
        `INSERT INTO popular_items
         (section, title, description, image_url, image_public_id, link_type, link_slug, sort_order)
         VALUES ($1,$2,$3,$4,$5,'category',$6,$7)
         RETURNING *`,
        [
          section,
          title,
          description ?? null,
          image_url ?? null,
          image_public_id ?? null,
          link_slug,
          sort_order,
        ]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "popular_create_failed" });
    }
  });

  // PATCH /popular/:id  (admin) — безопасно переименовывает slug категории и синхронизирует заголовки
  r.patch("/:id", authMiddleware, adminOnly, async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const body = req.body || {};

      await client.query("BEGIN");

      // 1) читаем текущий элемент
      const cur = await client.query(
        `SELECT *
           FROM popular_items
          WHERE id=$1
          FOR UPDATE`,
        [id]
      );
      if (cur.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "not_found" });
      }

      const current = cur.rows[0];

      const newLinkType =
        Object.prototype.hasOwnProperty.call(body, "link_type")
          ? body.link_type
          : current.link_type;

      const newLinkSlugRaw =
        Object.prototype.hasOwnProperty.call(body, "link_slug")
          ? body.link_slug
          : current.link_slug;

      const newLinkSlug =
        typeof newLinkSlugRaw === "string"
          ? newLinkSlugRaw.trim()
          : newLinkSlugRaw;

      const oldSlug = current.link_slug;
      const newTitle =
        Object.prototype.hasOwnProperty.call(body, "title") &&
        body.title !== null
          ? body.title
          : current.title;

      // 2) если меняем slug категории: переносим ссылки, чтобы не нарушить FK
      if (
        newLinkType === "category" &&
        newLinkSlug &&
        oldSlug &&
        newLinkSlug !== oldSlug
      ) {
        // проверяем дубли среди popular_items
        const dupPopular = await client.query(
          `SELECT id FROM popular_items
            WHERE link_type='category'
              AND link_slug=$1
              AND id<>$2`,
          [newLinkSlug, id]
        );
        if (dupPopular.rowCount > 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({ error: "slug_taken" });
        }

        // проверяем дубли среди categories
        const dupCat = await client.query(
          `SELECT id FROM categories
            WHERE slug=$1 AND slug<>$2`,
          [newLinkSlug, oldSlug]
        );
        if (dupCat.rowCount > 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({ error: "slug_taken" });
        }

        // читаем старую категорию (если есть)
        const catRes = await client.query(
          `SELECT *
             FROM categories
            WHERE slug=$1
            FOR UPDATE`,
          [oldSlug]
        );

        // если категория существует — создаём новую строку с новым slug
        if (catRes.rowCount > 0) {
          const cat = catRes.rows[0];

          await client.query(
            `INSERT INTO categories (slug, title, label, is_active)
             VALUES ($1, $2, $3, $4)`,
            [
              newLinkSlug,
              newTitle || cat.title,
              newTitle || cat.label,
              cat.is_active ?? true,
            ]
          );
        }

        // переносим ВСЕ статьи с oldSlug на newSlug
        await client.query(
          `UPDATE articles
              SET category_slug=$1
            WHERE category_slug=$2`,
          [newLinkSlug, oldSlug]
        );

        // удаляем старую категорию (теперь на неё никто не ссылается)
        await client.query(
          `DELETE FROM categories
            WHERE slug=$1`,
          [oldSlug]
        );
      }

      // 2.1. СИНХРОНИЗАЦИЯ title/label категории и title/seo_meta_title статей
      const effectiveSlug =
        newLinkType === "category"
          ? (newLinkSlug || oldSlug)
          : null;

      if (effectiveSlug && newTitle) {
        await client.query(
          `UPDATE categories
              SET title=$1,
                  label=$1
            WHERE slug=$2`,
          [newTitle, effectiveSlug]
        );

        await client.query(
          `UPDATE articles
              SET title=$1,
                  seo_meta_title=$1
            WHERE category_slug=$2
              AND type='category_page'`,
          [newTitle, effectiveSlug]
        );
      }

      // 3) обычное обновление popular_items
      const fields = [
        "section",
        "title",
        "description",
        "image_url",
        "image_public_id",
        "link_type",
        "link_slug",
        "sort_order",
      ];
      const sets = [];
      const values = [];
      for (const f of fields) {
        if (Object.prototype.hasOwnProperty.call(body, f)) {
          sets.push(`${f} = $${values.length + 1}`);
          values.push(body[f]);
        }
      }

      if (!sets.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "no_fields" });
      }

      values.push(id);
      const { rows } = await client.query(
        `UPDATE popular_items
            SET ${sets.join(", ")}, updated_at=now()
          WHERE id=$${values.length}
          RETURNING *`,
        values
      );

      await client.query("COMMIT");
      if (!rows.length) {
        return res.status(404).json({ error: "not_found" });
      }
      res.json(rows[0]);
    } catch (e) {
      console.error("popular_update_failed", e);
      try {
        await client.query("ROLLBACK");
      } catch {}
      res.status(500).json({ error: "popular_update_failed" });
    } finally {
      client.release();
    }
  });

  // DELETE /popular/:id  (admin) — удаляет карточку + все статьи категории + саму категорию
  r.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      await client.query("BEGIN");

      // читаем элемент под блокировку
      const cur = await client.query(
        `SELECT link_type, link_slug
           FROM popular_items
          WHERE id=$1
          FOR UPDATE`,
        [id]
      );
      if (cur.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "not_found" });
      }

      const { link_type, link_slug } = cur.rows[0];

      // если вёл на категорию — удалить ВСЕ статьи и категорию
      if (link_type === "category" && link_slug) {
        await client.query(
          `DELETE FROM articles
            WHERE category_slug=$1`,
          [link_slug]
        );
        await client.query(
          `DELETE FROM categories
            WHERE slug=$1`,
          [link_slug]
        );
      }

      // удалить сам элемент
      await client.query(`DELETE FROM popular_items WHERE id=$1`, [id]);

      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      try { await client.query("ROLLBACK"); } catch {}
      res.status(500).json({ error: "popular_delete_failed" });
    } finally {
      client.release();
    }
  });

  // PATCH /popular/reorder/:section  (admin) — сохранить порядок
  r.patch("/reorder/:section", authMiddleware, adminOnly, async (req, res) => {
    const client = await pool.connect();
    try {
      const { section } = req.params;
      const { idsInOrder = [] } = req.body || {};
      if (!Array.isArray(idsInOrder)) {
        return res.status(400).json({ error: "idsInOrder_must_be_array" });
      }

      await client.query("BEGIN");
      for (let i = 0; i < idsInOrder.length; i++) {
        await client.query(
          `UPDATE popular_items
              SET sort_order=$1, updated_at=now()
            WHERE id=$2 AND section=$3`,
          [i, idsInOrder[i], section]
        );
      }
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      console.error(e);
      res.status(500).json({ error: "popular_reorder_failed" });
    } finally {
      client.release();
    }
  });

  app.use("/popular", r);
}
