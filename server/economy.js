// economy.js (ESM)
import { Router } from "express";

export default function registerEconomyRoutes(app, pool, authMiddleware, adminOnly) {
  const r = Router();

  // GET /api/economy?section=popular
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

  // POST /api/economy  (admin)
  r.post("/", authMiddleware, adminOnly, async (req, res) => {
    try {
      const {
        section, title, image_url, image_public_id,
        link_type, link_slug, link_url, sort_order = 0, is_active = true,
      } = req.body || {};

      if (!section || !image_url || !link_type) return res.status(400).json({ error: "missing_fields" });
      if (link_type === "category" && !link_slug) return res.status(400).json({ error: "missing_link_slug" });
      if (link_type === "url" && !link_url) return res.status(400).json({ error: "missing_link_url" });

      const { rows } = await pool.query(
        `INSERT INTO economy_items
         (section,title,image_url,image_public_id,link_type,link_slug,link_url,sort_order,is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [section, title || null, image_url, image_public_id || null,
         link_type, link_slug || null, link_url || null, sort_order, !!is_active]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "economy_create_failed" });
    }
  });

  // PATCH /api/economy/:id  (admin)
  r.patch("/:id", authMiddleware, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const fields = [
        "section","title","image_url","image_public_id",
        "link_type","link_slug","link_url","sort_order","is_active",
      ];
      const sets = [];
      const values = [];
      for (const f of fields) {
        if (f in req.body) {
          sets.push(`${f} = $${values.length + 1}`);
          values.push(req.body[f]);
        }
      }
      if (!sets.length) return res.status(400).json({ error: "no_fields" });
      values.push(id);
      const { rows } = await pool.query(
        `UPDATE economy_items SET ${sets.join(", ")}, updated_at=now()
         WHERE id=$${values.length} RETURNING *`,
        values
      );
      if (!rows.length) return res.status(404).json({ error: "not_found" });
      res.json(rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "economy_update_failed" });
    }
  });

  // DELETE /api/economy/:id  (admin)
 // DELETE /api/economy/:id  (admin) — удаляет постер + связанную категорию/страницу, если постер ссылался на категорию
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
    try { await client.query("ROLLBACK"); } catch {}
    res.status(500).json({ error: "economy_delete_failed" });
  } finally {
    client.release();
  }
});


  // PATCH /api/economy/reorder/:section  (admin)
  r.patch("/reorder/:section", authMiddleware, adminOnly, async (req, res) => {
    const client = await pool.connect();
    try {
      const { section } = req.params;
      const { idsInOrder = [] } = req.body || {};
      if (!Array.isArray(idsInOrder)) return res.status(400).json({ error: "idsInOrder_must_be_array" });

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
      await client.query("ROLLBACK").catch(()=>{});
      console.error(e);
      res.status(500).json({ error: "economy_reorder_failed" });
    } finally {
      client.release();
    }
  });

  app.use("/economy", r);
}
