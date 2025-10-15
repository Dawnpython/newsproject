// /src/components/makecategory/Makecategory.jsx
import React, { useEffect, useMemo, useState } from "react";
import Pr from '/src/blocks/pr/Pr.jsx'
import "/src/components/makecategory/Makecategory.css";

/** ===== API base (очень важно для продакшена) ===== */
const API_BASE = "https://newsproject-tnkc.onrender.com"; // ← твой бек на Render

const API = {
  categories: `${API_BASE}/categories`,
  page: (slug) => `${API_BASE}/page/${slug}`,
  patchCategory: (id) => `${API_BASE}/categories/${id}`,
  upsertCategoryPage: (slug) => `${API_BASE}/category-page/${slug}`,
  cloudinarySignature: `${API_BASE}/api/uploads/signature`,
};

// простая обёртка для auth заголовка; поправь под свой сторедж токена
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Стартовые структуры блоков */
const initialBlock = (type) => {
  switch (type) {
    case "image_slider":
      return { type: "image_slider", data: { images: [{ url: "", alt: "" }] } };
    case "text_block":
      return { type: "text_block", data: { text: "" } };
    case "ad_block":
      return { type: "ad_block", data: {} };
    case "template_block":
      return { type: "template_block", data: {} };
    default:
      return { type, data: {} };
  }
};

export default function Makecategory() {
  const [categories, setCategories] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  // HERO (добавили cover_public_id)
  const [hero, setHero] = useState({
    title: "",
    subtitle: "",
    cover_url: "",
    cover_public_id: "",
  });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // CONTENT
  const [blocks, setBlocks] = useState([]);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // загрузка категорий
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(API.categories);
        const data = await res.json();
        setCategories(data || []);
        const first = (data || []).find((c) => c.is_active) || (data || [])[0];
        if (first) setSelectedSlug(first.slug);
      } catch (e) {
        console.error(e);
        setMsg("Не удалось загрузить категории");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // загрузка страницы по slug
  useEffect(() => {
    if (!selectedSlug) return;
    (async () => {
      try {
        setLoading(true);
        setMsg("");
        const cat = categories.find((c) => c.slug === selectedSlug);
        if (cat) {
          setSelectedCategory(cat);
          setHero({
            title: cat.title || "",
            subtitle: cat.subtitle || "",
            cover_url: cat.cover_url || "",
            cover_public_id: cat.cover_public_id || "",
          });
        } else {
          setSelectedCategory(null);
          setHero({ title: "", subtitle: "", cover_url: "", cover_public_id: "" });
        }
        const res = await fetch(API.page(selectedSlug));
        if (res.status === 404) {
          setBlocks([]);
          return;
        }
        const data = await res.json();
        const content = data?.article?.content_json || [];
        setBlocks(Array.isArray(content) ? content : []);
      } catch (e) {
        console.error(e);
        setMsg("Не удалось загрузить страницу");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug, categories.length]);

  // hero handlers
  const updateHeroField = (key, value) => setHero((h) => ({ ...h, [key]: value }));

  const saveHero = async () => {
    if (!selectedCategory) return setMsg("Категория не выбрана");
    try {
      setSaving(true);
      setMsg("");
      const res = await fetch(API.patchCategory(selectedCategory.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(hero), // title, subtitle, cover_url, cover_public_id
      });
      if (!res.ok) throw new Error("PATCH category failed");
      const updated = await res.json();
      setSelectedCategory(updated);
      setCategories((arr) => arr.map((c) => (c.id === updated.id ? updated : c)));
      setMsg("Hero сохранён");
      setLastSavedAt(new Date());
    } catch (e) {
      console.error(e);
      setMsg("Ошибка сохранения Hero");
    } finally {
      setSaving(false);
    }
  };

  // ======= Cloudinary upload (signed) =======
  async function uploadHeroToCloudinary(file) {
    try {
      setUploading(true);
      setUploadProgress(0);

      // 1) получаем подпись от нашего API
      const sigRes = await fetch(API.cloudinarySignature, {
        headers: { ...authHeaders() },
      });
      if (!sigRes.ok) throw new Error("signature_failed");
      const { timestamp, signature, folder, api_key, cloud_name } = await sigRes.json();

      // 2) отправляем файл в Cloudinary
      const url = `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`;
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", api_key);
      form.append("timestamp", timestamp);
      form.append("signature", signature);
      form.append("folder", folder);

      const xhr = new XMLHttpRequest();
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.open("POST", url);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const p = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(p);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error("upload_failed"));
          }
        };
        xhr.onerror = () => reject(new Error("xhr_error"));
        xhr.send(form);
      });

      const result = await uploadPromise;
      const { secure_url, public_id } = result;
      updateHeroField("cover_url", secure_url);
      updateHeroField("cover_public_id", public_id);
      setMsg("Изображение загружено");
    } catch (e) {
      console.error(e);
      setMsg("Не удалось загрузить в Cloudinary");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  // content handlers
  const addBlock = (type) => setBlocks((b) => [...b, initialBlock(type)]);
  const updateBlock = (index, updater) =>
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...updater } : b)));
  const moveBlockUp = (index) => {
    if (index === 0) return;
    setBlocks((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };
  const moveBlockDown = (index) => {
    setBlocks((prev) => {
      if (index === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
      return arr;
    });
  };
  const removeBlock = (index) => setBlocks((prev) => prev.filter((_, i) => i !== index));

  const saveContent = async (status = "draft") => {
    if (!selectedSlug) return setMsg("Категория не выбрана");
    try {
      setSaving(true);
      setMsg("");
      const res = await fetch(API.upsertCategoryPage(selectedSlug), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status, content_json: blocks }),
      });
      if (!res.ok) throw new Error("PUT content failed");
      await res.json();
      setMsg(status === "published" ? "Опубликовано" : "Черновик сохранён");
      setLastSavedAt(new Date());
    } catch (e) {
      console.error(e);
      setMsg("Ошибка сохранения контента");
    } finally {
      setSaving(false);
    }
  };

  // локальный предпросмотр
  const localPreview = useMemo(() => {
    const renderText = (text = "") => {
      const paragraphs = String(text).split(/\n{2,}/);
      return paragraphs.map((p, i) => (
        <p key={i}>
          {p.split(/\n/).map((line, j) => (
            <React.Fragment key={j}>
              {line}
              {j < p.split(/\n/).length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      ));
    };

    return (
      <div className="preview">
        <div
          className="preview-hero"
          style={{ backgroundImage: hero.cover_url ? `url(${hero.cover_url})` : undefined }}
        >
          <div className="preview-hero-overlay" />
          <div className="preview-hero-text">
            <h2>{hero.title || "Без заголовка"}</h2>
            <p>{hero.subtitle || "Подзаголовок"}</p>
          </div>
        </div>

        <div className="preview-body">
          {blocks.map((b, idx) => {
            if (b.type === "image_slider") {
              return (
                <div key={idx} className="preview-block">
                  <h4>Слайдер</h4>
                  <div className="preview-slider">
                    {(b.data?.images || []).map((img, i) => (
                      <img key={i} src={img.url} alt={img.alt || ""} />
                    ))}
                  </div>
                </div>
              );
            }
            if (b.type === "text_block") {
              return (
                <div key={idx} className="preview-block text">
                  {renderText(b.data?.text || "")}
                </div>
              );
            }
            if (b.type === "ad_block") {
              return (
                <div key={idx} className="preview-block ad">
                  <Pr/>
                </div>
              );
            }
            if (b.type === "template_block") {
              return (
                <div key={idx} className="preview-block template">
                  <div className="tpl-box">
                    <h4>Шаблонный блок</h4>
                    <ul>
                      <li>Пункт 1</li>
                      <li>Пункт 2</li>
                      <li>Пункт 3</li>
                    </ul>
                  </div>
                </div>
              );
            }
            return (
              <div key={idx} className="preview-block">
                <h4>{b.type}</h4>
                <p>Нестандартный блок</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [hero, blocks]);

  return (
    <div className="adm-wrap">
      <header className="adm-header">
        <h1>Контент страниц</h1>
      </header>

      {/* Категория */}
      <section className="adm-card">
        <label className="adm-label">Категория</label>
        <div className="adm-row">
          <select
            className="adm-select"
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          {loading && <span className="adm-badge">Загрузка…</span>}
        </div>
        {selectedCategory && (
          <p className="adm-muted">
            ID: {selectedCategory.id} • slug: {selectedCategory.slug}
          </p>
        )}
      </section>

      {/* HERO */}
      <section className="adm-card">
        <h3 className="adm-card-title">Hero-блок</h3>
        <div className="adm-field">
          <label className="adm-label">Заголовок</label>
          <input
            className="adm-input"
            value={hero.title}
            onChange={(e) => updateHeroField("title", e.target.value)}
            placeholder="Например: Такси и трансферы"
          />
        </div>
        <div className="adm-field">
          <label className="adm-label">Подзаголовок</label>
          <input
            className="adm-input"
            value={hero.subtitle}
            onChange={(e) => updateHeroField("subtitle", e.target.value)}
            placeholder="Выбери лучший способ передвижения по городу"
          />
        </div>

        {/* Новый блок загрузки */}
        <div className="adm-field">
          <label className="adm-label">Cover</label>
          <div className="adm-upload">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadHeroToCloudinary(f);
              }}
            />
            {uploading && <div className="adm-progress">Загрузка: {uploadProgress}%</div>}
          </div>
          {hero.cover_url ? (
            <div className="adm-cover-preview-wrap">
              <img className="adm-cover-preview" src={hero.cover_url} alt="cover" />
              <div className="adm-cover-meta">
                <div className="adm-muted small">public_id: {hero.cover_public_id || "—"}</div>
                <button className="adm-mini" onClick={() => updateHeroField("cover_url", "")}>
                  Очистить
                </button>
              </div>
            </div>
          ) : (
            <div className="adm-cover-skeleton">Нет изображения</div>
          )}
        </div>

        <button className="adm-btn" onClick={saveHero} disabled={saving}>
          Сохранить Hero
        </button>
      </section>

      {/* CONTENT */}
      <section className="adm-card">
        <h3 className="adm-card-title">Контент (блоки)</h3>

        {/* Палитра */}
        <div className="adm-addrow">
          <button className="adm-chip" onClick={() => addBlock("image_slider")}>
            + Слайдер
          </button>
          <button className="adm-chip" onClick={() => addBlock("text_block")}>
            + Текст
          </button>
          <button className="adm-chip" onClick={() => addBlock("ad_block")}>
            + Реклама
          </button>
          <button className="adm-chip" onClick={() => addBlock("template_block")}>
            + Шаблон
          </button>
        </div>

        {/* Список блоков */}
        <div className="adm-blocks">
          {blocks.map((b, idx) => (
            <BlockEditor
              key={idx}
              index={idx}
              block={b}
              onChange={(upd) => updateBlock(idx, upd)}
              onUp={() => moveBlockUp(idx)}
              onDown={() => moveBlockDown(idx)}
              onRemove={() => removeBlock(idx)}
            />
          ))}
          {blocks.length === 0 && (
            <p className="adm-muted">Пока нет блоков. Добавь слайдер, текст, рекламу или шаблон.</p>
          )}
        </div>
      </section>

      {/* Превью */}
      <section className="adm-card">
        <h3 className="adm-card-title">Локальный предпросмотр</h3>
        {localPreview}
      </section>

      {/* Нижняя панель */}
      <div className="adm-footer">
        <button className="adm-btn ghost" onClick={() => saveContent("draft")} disabled={saving}>
          Сохранить черновик
        </button>
        <button className="adm-btn primary" onClick={() => saveContent("published")} disabled={saving}>
          Опубликовать
        </button>
      </div>

      {!!msg && <div className="adm-toast">{msg}</div>}
      {!!lastSavedAt && (
        <div className="adm-toast muted">Обновлено: {lastSavedAt.toLocaleTimeString()}</div>
      )}
    </div>
  );
}

/* --- Редактор отдельного блока --- */
function BlockEditor({ block, index, onChange, onUp, onDown, onRemove }) {
  return (
    <div className="blk">
      <div className="blk-head">
        <span className="blk-type">
          {index + 1}. {labelByType(block.type)}
        </span>
        <div className="blk-actions">
          <button className="blk-ctrl" onClick={onUp} aria-label="Вверх">▲</button>
          <button className="blk-ctrl" onClick={onDown} aria-label="Вниз">▼</button>
          <button className="blk-ctrl danger" onClick={onRemove} aria-label="Удалить">✖</button>
        </div>
      </div>

      {/* image_slider */}
      {block.type === "image_slider" && (
        <div className="blk-body">
          <label className="adm-label">Изображения</label>
          {(block.data?.images || []).map((img, i) => (
            <div className="img-row" key={i}>
              <input
                className="adm-input"
                placeholder="Image URL"
                value={img.url}
                onChange={(e) => {
                  const next = [...(block.data?.images || [])];
                  next[i] = { ...next[i], url: e.target.value };
                  onChange({ data: { ...block.data, images: next } });
                }}
              />
              <input
                className="adm-input"
                placeholder="ALT"
                value={img.alt || ""}
                onChange={(e) => {
                  const next = [...(block.data?.images || [])];
                  next[i] = { ...next[i], alt: e.target.value };
                  onChange({ data: { ...block.data, images: next } });
                }}
              />
              <button
                className="adm-mini danger"
                onClick={() => {
                  const next = (block.data?.images || []).filter((_, k) => k !== i);
                  onChange({ data: { ...block.data, images: next } });
                }}
              >
                Удалить
              </button>
            </div>
          ))}
          <button
            className="adm-mini"
            onClick={() => {
              const next = [...(block.data?.images || []), { url: "", alt: "" }];
              onChange({ data: { ...block.data, images: next } });
            }}
          >
            + Добавить изображение
          </button>
        </div>
      )}

      {/* text_block */}
      {block.type === "text_block" && (
        <div className="blk-body">
          <label className="adm-label">Текст (абзацы разделяй пустой строкой)</label>
          <textarea
            className="adm-textarea"
            rows={8}
            placeholder="Напиши контент..."
            value={block.data?.text || ""}
            onChange={(e) => onChange({ data: { ...block.data, text: e.target.value } })}
          />
          <div className="adm-muted" style={{ marginTop: 8 }}>
            Символов: {(block.data?.text || "").length}
          </div>
        </div>
      )}

      {/* ad_block / template_block */}
      {block.type === "ad_block" && <Pr/>}

      {block.type === "template_block" && (
        <div className="blk-body">
          <div className="tpl-box editor">
            <h4>Шаблонный блок</h4>
            <p>Готовый JSX. Настроек нет.</p>
            <ul>
              <li>Элемент 1</li>
              <li>Элемент 2</li>
              <li>Элемент 3</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function labelByType(type) {
  switch (type) {
    case "image_slider":
      return "Слайдер изображений";
    case "text_block":
      return "Текстовый блок";
    case "ad_block":
      return "Реклама (статичный)";
    case "template_block":
      return "Шаблон (статичный)";
    default:
      return type;
  }
}
