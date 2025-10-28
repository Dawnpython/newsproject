// popular.js (ESM)
import { Router } from "express";

/**
 * Таблица popular_items должна иметь поля:
 * id SERIAL PK,
 * section TEXT NOT NULL,                -- water|premium|extreme|walk|kids|fun (или свои)
 * title TEXT NOT NULL,
 * description TEXT,                     -- короткий текст для карточки
 * image_url TEXT,
 * image_public_id TEXT,
 * link_type TEXT NOT NULL DEFAULT 'category',
 * link_slug TEXT NOT NULL,              -- slug созданной категории/страницы
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
        link_slug,           // ссылка всегда на категорию
        sort_order = 0,
      } = req.body || {};

      if (!section || !title || !link_slug) {
        return res.status(400).json({ error: "missing_fields" });
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

  // PATCH /popular/:id  (admin) — обновить карточку
  r.patch("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;

      // Разрешаем апдейтить только эти поля
      const whitelist = [
        "section",
        "title",
        "description",
        "image_url",
        "image_public_id",
        "link_slug",     // link_type фиксированный = 'category'
        "sort_order",
      ];

      const sets = [];
      const values = [];
      for (const f of whitelist) {
        if (f in req.body) {
          sets.push(`${f} = $${values.length + 1}`);
          values.push(req.body[f]);
        }
      }
      if (!sets.length) return res.status(400).json({ error: "no_fields" });

      // гарантируем link_type='category'
      sets.push(`link_type = 'category'`);

      values.push(id);
      const { rows } = await pool.query(
        `UPDATE popular_items
           SET ${sets.join(", ")}, updated_at = now()
         WHERE id = $${values.length}
         RETURNING *`,
        values
      );

      if (!rows.length) return res.status(404).json({ error: "not_found" });
      res.json(rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "popular_update_failed" });
    }
  });

  // DELETE /popular/:id  (admin)
  // При удалении — как и в economy: если карточка вела на категорию, чистим связанную страницу и категорию
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

      // если вёл на категорию — удалить страницу и категорию
      if (link_type === "category" && link_slug) {
        await client.query(
          `DELETE FROM articles
            WHERE type='category_page' AND category_slug=$1`,
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
      try { await pool.query("ROLLBACK"); } catch {}
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
