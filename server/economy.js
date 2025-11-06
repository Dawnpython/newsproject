// economy.js (ESM)
import { Router } from "express";

export default function registerEconomyRoutes(app, pool, authMiddleware, adminOnly) {
  const r = Router();

  // GET /economy?section=popular
  r.get("/", async (req, res) => {
    try {
      const { section } = req.query;
      if (section) {
        const { rows } = await pool.query(
          `SELECT * FROM economy_items
           WHERE section=$1 AND is_active=TRUE
           ORDER BY sort_order ASC, id ASC`,
          [section]
        );
        return res.json({ [section]: rows });
      }
      const { rows } = await pool.query(
        `SELECT * FROM economy_items
         WHERE is_active=TRUE
         ORDER BY section ASC, sort_order ASC, id ASC`
      );
      const grouped = rows.reduce((acc, it) => {
        (acc[it.section] ||= []).push(it);
        return acc;
      }, {});
      res.json(grouped);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "economy_list_failed" });
    }
  });

  // POST /economy  (admin)
  r.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const {
        section,
        title,
        image_url,
        image_public_id,
        link_type,
        link_slug,
        link_url,
        sort_order = 0,
        is_active = true,
      } = req.body || {};

      if (!section || !image_url || !link_type)
        return res.status(400).json({ error: "missing_fields" });
      if (link_type === "category" && !link_slug)
        return res.status(400).json({ error: "missing_link_slug" });
      if (link_type === "url" && !link_url)
        return res.status(400).json({ error: "missing_link_url" });

      // Можно дополнительно проверять уникальность slug для safety
      if (link_type === "category" && link_slug) {
        const check = await pool.query(
          `SELECT id FROM economy_items
           WHERE link_type='category' AND link_slug=$1`,
          [link_slug]
        );
        if (check.rowCount > 0) {
          return res.status(409).json({ error: "slug_taken" });
        }
      }

      const { rows } = await pool.query(
        `INSERT INTO economy_items
         (section,title,image_url,image_public_id,link_type,link_slug,link_url,sort_order,is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          section,
          title || null,
          image_url,
          image_public_id || null,
          link_type,
          link_slug || null,
          link_url || null,
          sort_order,
          !!is_active,
        ]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "economy_create_failed" });
    }
  });

  // PATCH /economy/:id  (admin)
  // умеет менять slug категории и связанных сущностей
  r.patch("/:id", authMiddleware, adminOnly, async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      await client.query("BEGIN");

      // 1) читаем текущий элемент
      const cur = await client.query(
        `SELECT *
           FROM economy_items
          WHERE id=$1
          FOR UPDATE`,
        [id]
      );
      if (cur.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "not_found" });
      }

      const current = cur.rows[0];

      const {
        section,
        title,
        image_url,
        image_public_id,
        link_type,
        link_slug,
        link_url,
        sort_order,
        is_active,
      } = req.body || {};

      const newLinkType =
        typeof link_type !== "undefined" ? link_type : current.link_type;
      const newLinkSlugRaw =
        typeof link_slug !== "undefined" ? link_slug : current.link_slug;
      const newLinkSlug =
        typeof newLinkSlugRaw === "string"
          ? newLinkSlugRaw.trim()
          : newLinkSlugRaw;
      const oldSlug = current.link_slug;

      const newTitle =
        typeof title !== "undefined" && title !== null
          ? title
          : current.title;

      // 2) если нужно — переименовываем slug категории/страницы
      if (
        newLinkType === "category" &&
        newLinkSlug &&
        oldSlug &&
        newLinkSlug !== oldSlug
      ) {
        // Проверка, что slug не занят другим economy_item
        const dup = await client.query(
          `SELECT id FROM economy_items
            WHERE link_type='category'
              AND link_slug=$1
              AND id<>$2`,
          [newLinkSlug, id]
        );
        if (dup.rowCount > 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({ error: "slug_taken" });
        }

        // Обновляем slug в categories (если такая категория есть)
        await client.query(
          `UPDATE categories
              SET slug=$1,
                  title=COALESCE($2, title),
                  label=COALESCE($2, label),
                  updated_at=now()
            WHERE slug=$3`,
          [newLinkSlug, newTitle, oldSlug]
        );

        // Обновляем slug в articles (страницы категории)
        await client.query(
          `UPDATE articles
              SET category_slug=$1,
                  title=COALESCE($2, title),
                  seo_meta_title=COALESCE($2, seo_meta_title),
                  updated_at=now()
            WHERE category_slug=$3
              AND type='category_page'`,
          [newLinkSlug, newTitle, oldSlug]
        );
      }

      // 3) обычное обновление economy_items
      const fields = [
        "section",
        "title",
        "image_url",
        "image_public_id",
        "link_type",
        "link_slug",
        "link_url",
        "sort_order",
        "is_active",
      ];
      const sets = [];
      const values = [];
      for (const f of fields) {
        if (f in req.body) {
          sets.push(`${f} = $${values.length + 1}`);
          values.push(req.body[f]);
        }
      }

      if (!sets.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "no_fields" });
      }

      values.push(id);
      const { rows } = await client.query(
        `UPDATE economy_items
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
      console.error(e);
      try {
        await client.query("ROLLBACK");
      } catch {}
      res.status(500).json({ error: "economy_update_failed" });
    } finally {
      client.release();
    }
  });

  // DELETE /economy/:id  (admin) — удаляет постер + связанную категорию/страницу, если постер ссылался на категорию
  r.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;

      await client.query("BEGIN");

      // 1) читаем элемент (и лочим его строку)
      const cur = await client.query(
        `SELECT link_type, link_slug
           FROM economy_items
          WHERE id=$1
          FOR UPDATE`,
        [id]
      );
      if (cur.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "not_found" });
      }

      const { link_type, link_slug } = cur.rows[0];

      // 2) если постер вёл на категорию — удаляем её страницу и саму категорию
      if (link_type === "category" && link_slug) {
        // сначала статьи этой категории
        await client.query(
          `DELETE FROM articles
            WHERE type='category_page' AND category_slug=$1`,
          [link_slug]
        );
        // затем категорию
        await client.query(
          `DELETE FROM categories
            WHERE slug=$1`,
          [link_slug]
        );
      }

      // 3) сам элемент экономики
      await client.query(`DELETE FROM economy_items WHERE id=$1`, [id]);

      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      try {
        await client.query("ROLLBACK");
      } catch {}
      res.status(500).json({ error: "economy_delete_failed" });
    } finally {
      client.release();
    }
  });

  // PATCH /economy/reorder/:section  (admin)
  r.patch("/reorder/:section", authMiddleware, adminOnly, async (req, res) => {
    const client = await pool.connect();
    try {
      const { section } = req.params;
      const { idsInOrder = [] } = req.body || {};
      if (!Array.isArray(idsInOrder))
        return res
          .status(400)
          .json({ error: "idsInOrder_must_be_array" });

      await client.query("BEGIN");
      for (let i = 0; i < idsInOrder.length; i++) {
        await client.query(
          `UPDATE economy_items SET sort_order=$1, updated_at=now()
           WHERE id=$2 AND section=$3`,
          [i, idsInOrder[i], section]
        );
      }
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      console.error(e);
      res.status(500).json({ error: "economy_reorder_failed" });
    } finally {
      client.release();
    }
  });

  app.use("/economy", r);
}
