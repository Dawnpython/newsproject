import React, { useEffect, useState } from "react";
import "/src/components/admin/economyAdmin/Economy.css"; // реиспользуем стили

// === API ===
const API_BASE = "https://newsproject-dx8n.onrender.com";
const API = {
  createCategory: `${API_BASE}/categories`, // POST
  upsertCategoryPage: (slug) => `${API_BASE}/category-page/${slug}`, // PUT
  popular: `${API_BASE}/popular`, // CRUD для популярного
  reorder: (section) => `${API_BASE}/popular/reorder/${section}`,
  cloudinarySignature: `${API_BASE}/api/uploads/signature`,
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// === Helpers ===
function slugify(s = "") {
  // Транслит кириллицы → латиница + нормализация
  const map = {
    а:"a", б:"b", в:"v", г:"g", д:"d", е:"e", ё:"yo", ж:"zh", з:"z", и:"i", й:"y",
    к:"k", л:"l", м:"m", н:"n", о:"o", п:"p", р:"r", с:"s", т:"t", у:"u", ф:"f",
    х:"h", ц:"ts", ч:"ch", ш:"sh", щ:"shch", ъ:"", ы:"y", ь:"", э:"e", ю:"yu", я:"ya",
    ґ:"g", є:"ye", і:"i", ї:"yi",
  };
  const latin = s
    .toLowerCase()
    .replace(/[\u0400-\u04FF]/g, (ch) => map[ch] ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let slug = latin
    .replace(/[^a-z0-9\s-_]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) slug = "item-" + Date.now();
  return slug;
}

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

// === UI ===
const SECTIONS = [
  { id: "water",   label: "На воде" },
  { id: "premium", label: "Premium" },
  { id: "extreme", label: "Экстрим" },
  { id: "walk",    label: "Пешком" },
  { id: "kids",    label: "С детьми" },
  { id: "fun",     label: "Развлечения" },
];

export default function PopularAdmin() {
  const [tab, setTab] = useState(SECTIONS[0].id);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [reordering, setReordering] = useState(false);

  // load items for section
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setMsg("");
        const r = await fetch(`${API.popular}?section=${tab}`, { headers: { ...authHeaders() }});
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
    setItems(prev => ([
      ...prev,
      {
        id: `local_${Date.now()}`,
        section: tab,
        title: "",
        description: "", // <— новое поле для карточки
        _slug: "",
        image_url: "",
        image_public_id: "",
        sort_order: prev.length,
        _isNew: true,
      }
    ]));
  };

  const saveItem = async (it) => {
    try {
      setMsg("");
      const title = (it.title || "").trim();
      const slug = (it._slug || slugify(title)).trim();
      if (!title) {
        setMsg("Укажи название карточки/страницы");
        return;
      }

      // 1) Создаём/подтверждаем категорию
      const cRes = await fetch(API.createCategory, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ label: title, slug, title, is_active: true }),
      });
      if (!cRes.ok && cRes.status !== 409) {
        const t = await cRes.text().catch(()=>"");
        throw new Error(`create_category_failed ${t}`);
      }

      // 2) Создаём/обновляем черновик страницы
      const pRes = await fetch(API.upsertCategoryPage(slug), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          status: "draft",
          content_json: [],
          title,
          seo_meta_title: title,
          seo_meta_description: null,
          cover_image_url: null,
          excerpt: null,
        }),
      });
      if (!pRes.ok) {
        const t = await pRes.text().catch(()=>"");
        throw new Error(`create_page_failed ${t}`);
      }
      await pRes.json();

      // 3) Сохраняем сам элемент популярного
      const clean = {
        id: it.id,
        section: it.section,
        title,
        description: it.description ?? null,
        image_url: it.image_url,
        image_public_id: it.image_public_id,
        sort_order: it.sort_order,
        link_type: "category",
        link_slug: slug,
      };

      const isNew = it._isNew || String(it.id).startsWith("local_");
      const method = isNew ? "POST" : "PATCH";
      const url = isNew ? API.popular : `${API.popular}/${it.id}`;

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
      const r = await fetch(`${API.popular}/${id}`, {
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
        <h1>Популярное</h1>
      </header>

      <div className="adm-tabs">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={`adm-chip ${s.id === tab ? "active" : ""}`}
            onClick={() => setTab(s.id)}
          >
            {s.label}
          </button>
        ))}
        {loading && <span className="adm-badge">Загрузка…</span>}
      </div>

      <section className="adm-card">
        <div className="adm-card-head">
          <h3 className="adm-card-title">
            Элементы секции «{SECTIONS.find((s) => s.id === tab)?.label}»
          </h3>
          <div className="adm-row">
            <button className="adm-mini" onClick={addEmpty}>+ Добавить</button>
            <button className="adm-mini ghost" onClick={saveOrder} disabled={reordering}>
              Сохранить порядок
            </button>
          </div>
        </div>

        <div className="eco-admin-list">
          {items.map((it, i) => (
            <ItemRow
              key={it.id}
              item={it}
              onChange={(patch) =>
                setItems((arr) => arr.map((x) => (x.id === it.id ? { ...x, ...patch } : x)))
              }
              onSave={() => saveItem(it)}
              onDelete={() => deleteItem(it.id)}
              onUp={() => move(i, i - 1)}
              onDown={() => move(i, i + 1)}
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

function ItemRow({ item, onChange, onSave, onDelete, onUp, onDown }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      setProgress(0);
      const sig = await getSignature({ folder: "popular" }).catch(() => getSignature({}));
      const meta = await uploadFileToCloudinary(file, sig, (p) => setProgress(p));
      onChange({ image_url: meta.secure_url, image_public_id: meta.public_id });
    } catch (e) {
      console.error(e);
      alert("Не удалось загрузить изображение");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const updateTitle = (val) => onChange({ title: val, _slug: slugify(val) });
  const normalizeMultiline = (t) => (t || "").replace(/\\n|\/n|n\//g, "\n");

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
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
          Загрузить
        </label>
        {uploading && <span className="adm-progress">{progress}%</span>}
      </div>

      {/* form */}
      <div className="eco-form">
        <div className="eco-row">
          <input
            className="adm-input"
            placeholder="Название карточки / страницы"
            value={item.title || ""}
            onChange={(e) => updateTitle(e.target.value)}
          />
          {!!item.title && (
            <div className="adm-hint">Ссылка страницы: /c/{item._slug}</div>
          )}
        </div>

        <div className="eco-row">
          <textarea
            className="adm-textarea"
            placeholder="Короткое описание для карточки (необязательно)"
            rows={3}
            value={item.description || ""}
            onChange={(e) => onChange({ description: e.target.value })}
          />
          {!!item.description && (
            <div className="adm-hint" style={{ whiteSpace: "pre-line" }}>
              Превью описания:\n{normalizeMultiline(item.description)}
            </div>
          )}
        </div>

        <div className="eco-row smalls">
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
