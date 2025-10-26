import React, { useEffect, useState } from "react";
import "/src/components/admin/economyAdmin/Economy.css";

const API_BASE = "https://newsproject-dx8n.onrender.com";
const API = {
  categories: `${API_BASE}/categories`,
  createCategory: `${API_BASE}/categories`,             // POST
  upsertCategoryPage: (slug) => `${API_BASE}/category-page/${slug}`, // PUT
  economy: `${API_BASE}/api/economy`,                   // важно: с /api
  reorder: (section) => `${API_BASE}/api/economy/reorder/${section}`,
  cloudinarySignature: `${API_BASE}/api/uploads/signature`,
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ----- Cloudinary helpers -----
async function getSignature({ folder } = {}) {
  const res = await fetch(API.cloudinarySignature, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(folder ? { folder } : {}),
  });
  if (!res.ok) throw new Error("signature_failed");
  return res.json();
}

function uploadFileToCloudinary(file, sig, onProgress) {
  const url = `https://api.cloudinary.com/v1_1/${sig.cloud_name}/auto/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.api_key);
  form.append("timestamp", sig.timestamp);
  form.append("signature", sig.signature);
  if (sig.folder) form.append("folder", sig.folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch (err) { reject(err); }
      } else reject(new Error("upload_failed"));
    };
    xhr.onerror = () => reject(new Error("xhr_error"));
    xhr.send(form);
  });
}

// ----- UI -----
const SECTIONS = [
  { id: "popular", label: "Популярные" },
  { id: "tours",   label: "Экскурсии"  },
  { id: "food",    label: "Еда"        },
  { id: "shops",   label: "Магазины"   },
  { id: "hotels",  label: "Отели"      },
  { id: "other",   label: "Другое"     },
];

function slugify(s="") {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")    // убрать всё, кроме букв/цифр/пробела/дефиса/_
    .replace(/\s+/g, "-")        // пробелы -> "-"
    .replace(/-+/g, "-");        // сдвоенные дефисы -> один
}

export default function EconomyAdmin() {
  const [tab, setTab] = useState(SECTIONS[0].id);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [reordering, setReordering] = useState(false);

  // load categories for link_slug select
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(API.categories);
        const data = await r.json();
        setCategories(Array.isArray(data) ? data : []);
      } catch {}
    })();
  }, []);

  // load items for section
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setMsg("");
        const r = await fetch(`${API.economy}?section=${tab}`, { headers: { ...authHeaders() }});
        if (!r.ok) throw new Error("load_failed");
        const data = await r.json();
        if (!alive) return;
        setItems(Array.isArray(data?.[tab]) ? data[tab] : []);
      } catch (e) {
        console.error(e);
        if (alive) setMsg("Не удалось загрузить элементы");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tab]);

  const addEmpty = () => {
    setItems(prev => [
      ...prev,
      {
        id: `local_${Date.now()}`, // локальный id до сохранения
        section: tab,
        title: "",
        image_url: "",
        image_public_id: "",
        link_type: "category",     // по умолчанию ведём на категорию
        link_slug: categories[0]?.slug || "",
        link_url: "",
        sort_order: prev.length,
        is_active: true,
        _isNew: true,

        // расширение: режим создания новой категории/страницы
        _new_cat_mode: false,
        _new_label: "",
        _new_slug: "",
        _create_page: true, // создавать пустую страницу по-умолчанию
      },
    ]);
  };

  const saveItem = async (it) => {
    try {
      setMsg("");

      let payload = { ...it };
      delete payload._isNew;
      // вспомогательные поля UI
      const {
        _new_cat_mode,
        _new_label,
        _new_slug,
        _create_page,
        ...clean
      } = payload;

      // 1) Если включён режим "Создать новую категорию"
      if (_new_cat_mode) {
        const label = (_new_label || "").trim();
        const slug  = (_new_slug || slugify(label)).trim();
        if (!label || !slug) {
          setMsg("Укажи Label и Slug для новой категории");
          return;
        }

        // 1.1 Создаём категорию
        const cRes = await fetch(API.createCategory, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            label,
            slug,
            title: label,
            is_active: true,
          }),
        });
        if (!cRes.ok) {
          const t = await cRes.text().catch(()=> "");
          throw new Error(`create_category_failed ${t}`);
        }
        const createdCategory = await cRes.json();

        // 1.2 По желанию — создаём пустую страницу (черновик или опубликованную — выбери)
        if (_create_page) {
          const pRes = await fetch(API.upsertCategoryPage(slug), {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({
              status: "draft",
              content_json: [],
              title: label,
              seo_meta_title: label,
              seo_meta_description: null,
              cover_image_url: null,
              excerpt: null,
            }),
          });
          if (!pRes.ok) {
            const t = await pRes.text().catch(()=> "");
            throw new Error(`create_page_failed ${t}`);
          }
          await pRes.json();
        }

        // 1.3 Обновляем локальный список категорий (чтобы появилось в селекте)
        setCategories((list) => {
          if (Array.isArray(list)) return [createdCategory, ...list];
          return [createdCategory];
        });

        // 1.4 Привязываем элемент экономики к новосозданной категории
        clean.link_type = "category";
        clean.link_slug = slug;
      }

      // 2) Сохраняем/обновляем сам элемент экономики
      const isNew = it._isNew || String(it.id).startsWith("local_");
      const method = isNew ? "POST" : "PATCH";
      const url = isNew ? API.economy : `${API.economy}/${it.id}`;

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(clean),
      });
      if (!r.ok) throw new Error("save_failed");
      const saved = await r.json();

      setItems((arr) => arr.map((x) => (x.id === it.id ? saved : x)));
      setMsg("Сохранено");
    } catch (e) {
      console.error(e);
      setMsg("Ошибка сохранения");
    }
  };

  const deleteItem = async (id) => {
    if (!id || String(id).startsWith("local_")) {
      setItems((arr) => arr.filter((x) => x.id !== id));
      return;
    }
    try {
      const ok = confirm("Удалить элемент?");
      if (!ok) return;
      const r = await fetch(`${API.economy}/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (!r.ok) throw new Error("delete_failed");
      setItems((arr) => arr.filter((x) => x.id !== id));
      setMsg("Удалено");
    } catch (e) {
      console.error(e);
      setMsg("Ошибка удаления");
    }
  };

  const move = (from, to) => {
    setItems((arr) => {
      if (to < 0 || to >= arr.length) return arr;
      const next = [...arr];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next.map((x, i) => ({ ...x, sort_order: i }));
    });
  };

  const saveOrder = async () => {
    try {
      setReordering(true);
      const idsInOrder = items.map((x) => x.id).filter((id) => !String(id).startsWith("local_"));
      const r = await fetch(API.reorder(tab), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ idsInOrder }),
      });
      if (!r.ok) throw new Error("reorder_failed");
      setMsg("Порядок сохранён");
    } catch (e) {
      console.error(e);
      setMsg("Ошибка сохранения порядка");
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="adm-wrap">
      <header className="adm-header">
        <h1>Категории</h1>
      </header>

      {/* Таб-секции */}
      <div className="adm-tabs">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`adm-chip ${s.id===tab ? "active":""}`}
            onClick={() => setTab(s.id)}
          >
            {s.label}
          </button>
        ))}
        {loading && <span className="adm-badge">Загрузка…</span>}
      </div>

      {/* Список карточек */}
      <section className="adm-card">
        <div className="adm-card-head">
          <h3 className="adm-card-title">Элементы секции «{SECTIONS.find(s=>s.id===tab)?.label}»</h3>
          <div className="adm-row">
            <button className="adm-mini" onClick={addEmpty}>+ Добавить</button>
            <button className="adm-mini ghost" onClick={saveOrder} disabled={reordering}>Сохранить порядок</button>
          </div>
        </div>

        <div className="eco-admin-list">
          {items.map((it, i) => (
            <EconomyItemRow
              key={it.id}
              item={it}
              categories={categories}
              onChange={(patch) =>
                setItems(arr => arr.map(x => x.id === it.id ? { ...x, ...patch } : x))
              }
              onSave={() => saveItem(it)}
              onDelete={() => deleteItem(it.id)}
              onUp={() => move(i, i-1)}
              onDown={() => move(i, i+1)}
            />
          ))}
          {items.length === 0 && (
            <p className="adm-muted">Нет элементов. Добавь первый постер.</p>
          )}
        </div>
      </section>

      {!!msg && <div className="adm-toast">{msg}</div>}
    </div>
  );
}

function EconomyItemRow({ item, categories, onChange, onSave, onDelete, onUp, onDown }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true); setProgress(0);
      const sig = await getSignature({ folder: "economy" }).catch(() => getSignature({}));
      const meta = await uploadFileToCloudinary(file, sig, (p) => setProgress(p));
      onChange({
        image_url: meta.secure_url,
        image_public_id: meta.public_id,
      });
    } catch (e) {
      console.error(e);
      alert("Не удалось загрузить изображение");
    } finally {
      setUploading(false); setProgress(0);
    }
  };

  // генерация slug по вводу label
  const autoSlug = () => {
    if (!item._new_slug && item._new_label) {
      onChange({ _new_slug: slugify(item._new_label) });
    }
  };

  return (
    <div className="eco-admin-row">
      {/* preview */}
      <div className="eco-prev">
        {item.image_url ? (
          <img src={item.image_url} alt="" />
        ) : (
          <div className="eco-prev-empty">нет</div>
        )}
        <label className="adm-mini">
          <input type="file" accept="image/*" style={{display:"none"}}
                 onChange={(e)=>handleUpload(e.target.files?.[0])} />
          Загрузить
        </label>
        {uploading && <span className="adm-progress">{progress}%</span>}
      </div>

      {/* form */}
      <div className="eco-form">
        <div className="eco-row">
          <input
            className="adm-input"
            placeholder="Title (необязательно)"
            value={item.title || ""}
            onChange={(e)=>onChange({ title: e.target.value })}
          />
        </div>

        <div className="eco-row">
          <label className="adm-label">Куда ведёт клик</label>
          <div className="eco-link-row">
            <label className="adm-radio">
              <input
                type="radio"
                checked={item.link_type === "category"}
                onChange={()=>onChange({ link_type: "category" })}
              />
              Категория
            </label>
            <label className="adm-radio">
              <input
                type="radio"
                checked={item.link_type === "url"}
                onChange={()=>onChange({ link_type: "url" })}
              />
              Свой URL
            </label>
          </div>

          {/* режим выбора существующей категории или создание новой */}
          {item.link_type === "category" ? (
            <>
              <div className="eco-row smalls">
                <label className="adm-checkbox">
                  <input
                    type="checkbox"
                    checked={!!item._new_cat_mode}
                    onChange={(e)=>onChange({ _new_cat_mode: e.target.checked })}
                  />
                  Создать новую категорию
                </label>
              </div>

              {!item._new_cat_mode ? (
                <select
                  className="adm-select"
                  value={item.link_slug || ""}
                  onChange={(e)=>onChange({ link_slug: e.target.value })}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.slug}>{c.label} ({c.slug})</option>
                  ))}
                </select>
              ) : (
                <div className="eco-newcat">
                  <input
                    className="adm-input"
                    placeholder="Label категории"
                    value={item._new_label || ""}
                    onChange={(e)=>onChange({ _new_label: e.target.value })}
                    onBlur={autoSlug}
                  />
                  <input
                    className="adm-input"
                    placeholder="Slug (lat, например taxi)"
                    value={item._new_slug || ""}
                    onChange={(e)=>onChange({ _new_slug: e.target.value.toLowerCase() })}
                  />
                  <label className="adm-checkbox" style={{marginTop:8}}>
                    <input
                      type="checkbox"
                      checked={!!item._create_page}
                      onChange={(e)=>onChange({ _create_page: e.target.checked })}
                    />
                    Сразу создать пустую страницу
                  </label>
                </div>
              )}
            </>
          ) : (
            <input
              className="adm-input"
              placeholder="https://... или внутренний /c/..."
              value={item.link_url || ""}
              onChange={(e)=>onChange({ link_url: e.target.value })}
            />
          )}
        </div>

        <div className="eco-row smalls">
          <label className="adm-label">Активен</label>
          <input
            type="checkbox"
            checked={!!item.is_active}
            onChange={(e)=>onChange({ is_active: e.target.checked })}
          />
          <span className="spacer" />
          <label className="adm-label">Порядок</label>
          <button className="adm-mini" onClick={onUp}>↑</button>
          <button className="adm-mini" onClick={onDown}>↓</button>
        </div>

        <div className="eco-row actions">
          <button className="adm-mini primary" onClick={onSave}>Сохранить</button>
          <button className="adm-mini danger" onClick={onDelete}>Удалить</button>
        </div>
      </div>
    </div>
  );
}
