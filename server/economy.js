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

      // проверяем, что нет другого economy_item с таким slug
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

  // PATCH /economy/:id  (admin) — безопасно переименовывает slug категории и синхронизирует заголовки
  r.patch("/:id", authMiddleware, adminOnly, async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const body = req.body || {};

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
        // проверяем дубли среди economy_items
        const dupEconomy = await client.query(
          `SELECT id FROM economy_items
            WHERE link_type='category'
              AND link_slug=$1
              AND id<>$2`,
          [newLinkSlug, id]
        );
        if (dupEconomy.rowCount > 0) {
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
      // Работает КАЖДЫЙ РАЗ, когда есть title и link_type='category'
      const effectiveSlug =
        newLinkType === "category"
          ? (newLinkSlug || oldSlug)
          : null;

      if (effectiveSlug && newTitle) {
        // обновляем категорию
        await client.query(
          `UPDATE categories
              SET title=$1,
                  label=$1
            WHERE slug=$2`,
          [newTitle, effectiveSlug]
        );

        // обновляем заголовки страниц категории
        await client.query(
          `UPDATE articles
              SET title=$1,
                  seo_meta_title=$1
            WHERE category_slug=$2
              AND type='category_page'`,
          [newTitle, effectiveSlug]
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
      console.error("economy_update_failed", e);
      try {
        await client.query("ROLLBACK");
      } catch {}
      res.status(500).json({ error: "economy_update_failed" });
    } finally {
      client.release();
    }
  });

  // DELETE /economy/:id  (admin) — удаляет постер + ВСЕ статьи категории + саму категорию
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

      // 2) если постер вёл на категорию — удаляем ВСЕ статьи этой категории и саму категорию
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
