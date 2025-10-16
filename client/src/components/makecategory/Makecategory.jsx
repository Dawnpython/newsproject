// /src/components/makecategory/Makecategory.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import Pr from "/src/blocks/pr/Pr.jsx";
import "/src/components/makecategory/Makecategory.css";

/** ===== API base ===== */
const API_BASE = "https://newsproject-tnkc.onrender.com";

const API = {
  categories: `${API_BASE}/categories`,
  page: (slug) => `${API_BASE}/page/${slug}`,
  patchCategory: (id) => `${API_BASE}/categories/${id}`,
  upsertCategoryPage: (slug) => `${API_BASE}/category-page/${slug}`,
  cloudinarySignature: `${API_BASE}/api/uploads/signature`, // POST (auth + admin)
};

/** ===== Auth header helper (поправь под свой сторедж) ===== */
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** ===== Cloudinary helpers ===== */
async function getSignature({ folder } = {}) {
  const res = await fetch(API.cloudinarySignature, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(folder ? { folder } : {}),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`signature_failed (${res.status}) ${t}`);
  }
  return res.json(); // { timestamp, signature, folder, api_key, cloud_name }
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
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
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
}

async function uploadManyToCloudinary(files, { folder }, onFileProgress) {
  const sig = await getSignature({ folder }).catch(() => getSignature({}));
  const results = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const meta = await uploadFileToCloudinary(f, sig, (p) =>
      onFileProgress?.(i, p)
    );
    results.push({
      url: meta.secure_url,
      public_id: meta.public_id,
      width: meta.width,
      height: meta.height,
      alt: "",
    });
  }
  return results;
}

/** ===== Стартовые структуры блоков ===== */
const initialBlock = (type) => {
  switch (type) {
    case "image_slider":
      return {
        type: "image_slider",
        data: { images: [{ url: "", alt: "", public_id: "" }] },
      };
    case "text_block":
      return { type: "text_block", data: { text: "" } };
    case "ad_block":
      return { type: "ad_block", data: {} };
    case "template_block":
      return { type: "template_block", data: {} };
    case "image":
      return { type: "image", data: { url: "", alt: "", public_id: "" } };
    default:
      return { type, data: {} };
  }
};

export default function Makecategory() {
  const [categories, setCategories] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);

  // HERO
  const [hero, setHero] = useState({
    title: "",
    subtitle: "",
    cover_url: "",
    cover_public_id: "",
  });

  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroProgress, setHeroProgress] = useState(0);

  // CONTENT
  const [blocks, setBlocks] = useState([]);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  /** Загрузка категорий */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(API.categories);
        if (!res.ok) throw new Error("categories_failed");
        const data = await res.json();
        if (!alive) return;
        setCategories(Array.isArray(data) ? data : []);
        const first = (data || []).find((c) => c.is_active) || (data || [])[0];
        if (first) setSelectedSlug(first.slug);
      } catch (e) {
        console.error(e);
        if (alive) setMsg("Не удалось загрузить категории");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Загрузка статьи/страницы при смене slug или списков категорий */
  useEffect(() => {
    if (!selectedSlug) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setMsg("");

        const cat = categories.find((c) => c.slug === selectedSlug) || null;
        if (alive) {
          setSelectedCategory(cat);
          setHero({
            title: cat?.title || "",
            subtitle: cat?.subtitle || "",
            cover_url: cat?.cover_url || "",
            cover_public_id: cat?.cover_public_id || "",
          });
        }

        const res = await fetch(API.page(selectedSlug));
        if (res.status === 404) {
          if (alive) setBlocks([]);
          return;
        }
        if (!res.ok) throw new Error("page_failed");
        const data = await res.json();
        const content = data?.article?.content_json || [];
        if (alive) setBlocks(Array.isArray(content) ? content : []);
      } catch (e) {
        console.error(e);
        if (alive) setMsg("Не удалось загрузить страницу");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedSlug, categories]); // важно: следим за списком целиком

  /** Hero handlers */
  const updateHeroField = (key, value) =>
    setHero((h) => ({ ...h, [key]: value }));

  const clearCover = () => {
    setHero((h) => ({ ...h, cover_url: "", cover_public_id: "" }));
  };

  const saveHero = async () => {
    if (!selectedCategory) return setMsg("Категория не выбрана");
    try {
      setSaving(true);
      setMsg("");
      const body = {
        title: hero.title || "",
        subtitle: hero.subtitle || "",
        cover_url: hero.cover_url || "",
        cover_public_id: hero.cover_public_id || "",
      };
      const res = await fetch(API.patchCategory(selectedCategory.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("PATCH category failed");
      const updated = await res.json();
      setSelectedCategory(updated);
      setCategories((arr) =>
        arr.map((c) => (c.id === updated.id ? updated : c))
      );
      setMsg("Hero сохранён");
      setLastSavedAt(new Date());
    } catch (e) {
      console.error(e);
      setMsg("Ошибка сохранения Hero");
    } finally {
      setSaving(false);
    }
  };

  async function uploadHeroToCloudinary(file) {
    try {
      setUploadingHero(true);
      setHeroProgress(0);
      const sig = await getSignature({ folder: "categories/covers" }).catch(
        () => getSignature({})
      );
      const meta = await uploadFileToCloudinary(file, sig, (p) =>
        setHeroProgress(p)
      );
      updateHeroField("cover_url", meta.secure_url);
      updateHeroField("cover_public_id", meta.public_id);
      setMsg("Обложка загружена");
    } catch (e) {
      console.error(e);
      setMsg("Не удалось загрузить обложку");
    } finally {
      setUploadingHero(false);
      setHeroProgress(0);
    }
  }

  /** Content handlers */
  const addBlock = (type) => setBlocks((b) => [...b, initialBlock(type)]);
  const updateBlock = (index, updater) =>
    setBlocks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, ...updater } : b))
    );

  const swap = (arr, i, j) => {
    const next = [...arr];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };
  const moveBlockUp = (index) =>
    setBlocks((prev) => (index > 0 ? swap(prev, index, index - 1) : prev));
  const moveBlockDown = (index) =>
    setBlocks((prev) =>
      index < prev.length - 1 ? swap(prev, index, index + 1) : prev
    );
  const removeBlock = (index) =>
    setBlocks((prev) => prev.filter((_, i) => i !== index));

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

  /** Drag&Drop для зоны предпросмотра cover (не обязательно, но приятно) */
  const dropRef = useRef(null);
  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) uploadHeroToCloudinary(f);
    },
    [] // eslint-disable-line
  );
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e) => e.preventDefault();
    el.addEventListener("dragover", prevent);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", prevent);
      el.removeEventListener("drop", onDrop);
    };
  }, [onDrop]);

  /** Локальный предпросмотр */
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
          ref={dropRef}
          title="Перетащи сюда изображение для обложки"
          style={{
            backgroundImage: hero.cover_url
              ? `url(${hero.cover_url})`
              : undefined,
          }}
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
      const imgs = Array.isArray(b.data?.images) ? b.data.images : [];
      return (
        <div key={idx} className="preview-block">
          <h4>Слайдер</h4>
          <div className="preview-slider">
            {imgs.map((img, i) => (
              <img key={i} src={img.url} alt={img.alt || ""} />
            ))}
          </div>
        </div>
      );
    }

    /* ★★★ НОВОЕ: превью одиночного изображения ★★★ */
    if (b.type === "image") {
      const { url, alt } = b.data || {};
      if (!url) {
        return (
          <div key={idx} className="preview-block">
            <h4>Изображение</h4>
            <div className="adm-cover-skeleton">Нет изображения</div>
          </div>
        );
      }
      return (
        <div key={idx} className="preview-block image">
          <img
            src={url}
            alt={alt || ""}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: 8,
              border: "1px solid #eee",
            }}
          />
          {alt ? (
            <div
              className="preview-caption"
              style={{ marginTop: 6, fontSize: 12, color: "#666" }}
            >
              {alt}
            </div>
          ) : null}
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
          <Pr />
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
      </section>

      {/* HERO */}
      <section className="adm-card">
        <h3 className="adm-card-title">Hero-блок</h3>
        <div className="adm-field">
          <label className="adm-label">Заголовок</label>
          <input
            className="adm-input"
            vąalue={hero.title}
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

        {/* Загрузка обложки */}
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
            {uploadingHero && (
              <div className="adm-progress">Загрузка: {heroProgress}%</div>
            )}
          </div>
          {hero.cover_url ? (
            <div className="adm-cover-preview-wrap">
              <img
                className="adm-cover-preview"
                src={hero.cover_url}
                alt="cover"
              />
              <div className="adm-cover-meta">
                <div className="adm-cover-actions">
                  <button className="adm-mini" onClick={clearCover}>
                    Очистить
                  </button>
                  <button
                    className="adm-mini"
                    onClick={() => {
                      const url = prompt(
                        "Вставь URL обложки",
                        hero.cover_url || ""
                      );
                      if (url !== null) {
                        updateHeroField("cover_url", url.trim());
                        if (!url.trim()) updateHeroField("cover_public_id", "");
                      }
                    }}
                  >
                    Вставить URL
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="adm-cover-skeleton">
              Нет изображения (можно перетащить файл в предпросмотр)
            </div>
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
          <button
            className="adm-chip"
            onClick={() => addBlock("template_block")}
          >
            + Шаблон
          </button>
          <button className="adm-chip" onClick={() => addBlock("image")}>
            + Изображение
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
            <p className="adm-muted">
              Пока нет блоков. Добавь слайдер, текст, рекламу или шаблон.
            </p>
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
        <button
          className="adm-btn ghost"
          onClick={() => saveContent("draft")}
          disabled={saving}
        >
          Сохранить черновик
        </button>
        <button
          className="adm-btn primary"
          onClick={() => saveContent("published")}
          disabled={saving}
        >
          Опубликовать
        </button>
      </div>

      {!!msg && <div className="adm-toast">{msg}</div>}
      {!!lastSavedAt && (
        <div className="adm-toast muted">
          Обновлено: {lastSavedAt.toLocaleTimeString()}
        </div>
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
          <button
            className="blk-ctrl"
            onClick={onUp}
            aria-label="Вверх"
            title="Вверх"
          >
            ▲
          </button>
          <button
            className="blk-ctrl"
            onClick={onDown}
            aria-label="Вниз"
            title="Вниз"
          >
            ▼
          </button>
          <button
            className="blk-ctrl danger"
            onClick={onRemove}
            aria-label="Удалить"
            title="Удалить"
          >
            ✖
          </button>
        </div>
      </div>

      {block.type === "image_slider" && (
        <ImageSliderEditor block={block} onChange={onChange} />
      )}

      {block.type === "image" && <ImageBlockEditor block={block} onChange={onChange} />}


      {block.type === "text_block" && (
        <div className="blk-body">
          <label className="adm-label">
            Текст (абзацы разделяй пустой строкой)
          </label>
          <textarea
            className="adm-textarea"
            rows={8}
            placeholder="Напиши контент..."
            value={block.data?.text || ""}
            onChange={(e) =>
              onChange({ data: { ...block.data, text: e.target.value } })
            }
          />
          <div className="adm-muted" style={{ marginTop: 8 }}>
            Символов: {(block.data?.text || "").length}
          </div>
        </div>
      )}

      {block.type === "ad_block" && <Pr />}

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

function ImageBlockEditor({ block, onChange }) {
  const img = block?.data || {};
  const [progress, setProgress] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);

  const setData = (next) => onChange({ data: { ...img, ...next } });

  const handleUpload = async (file) => {
    try {
      if (!file) return;
      setUploading(true);
      setProgress(0);

      const sig = await getSignature({ folder: "categories/images" }).catch(() =>
        getSignature({})
      );

      const meta = await uploadFileToCloudinary(file, sig, (p) => setProgress(p));
      setData({
        url: meta.secure_url,
        public_id: meta.public_id,
        width: meta.width,
        height: meta.height,
      });
    } catch (e) {
      console.error(e);
      alert("Не удалось загрузить изображение");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // dnd
  const dropRef = React.useRef(null);
  React.useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e) => e.preventDefault();
    const onDrop = (e) => {
      e.preventDefault();
      const f = e.dataTransfer?.files?.[0];
      if (f) handleUpload(f);
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("drop", onDrop);
    };
  }, []); // eslint-disable-line

  const clearImage = () => setData({ url: "", public_id: "" });

  return (
    <div className="blk-body">
      <label className="adm-label">Изображение</label>

      <div
        ref={dropRef}
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: 12,
          border: "1px dashed #cfd8dc",
          borderRadius: 8,
        }}
        title="Перетащи сюда файл или используй кнопку загрузки"
      >
        {/* Превью */}
        {img?.url ? (
          <img
            src={img.url}
            alt=""
            style={{ width: 120, height: 72, objectFit: "cover", borderRadius: 8 }}
          />
        ) : (
          <div
            style={{
              width: 120,
              height: 72,
              background: "#eee",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#666",
            }}
          >
            нет
          </div>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            className="adm-input"
            placeholder="Image URL"
            value={img.url || ""}
            onChange={(e) => setData({ url: e.target.value })}
          />
          <input
            className="adm-input"
            placeholder="ALT (подпись/описание)"
            value={img.alt || ""}
            onChange={(e) => setData({ alt: e.target.value })}
          />

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label className="adm-mini">
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
              Загрузить файл
            </label>

            <button className="adm-mini" onClick={clearImage}>
              Очистить
            </button>

            {uploading && <span className="adm-progress">Загрузка: {progress}%</span>}
            {img.public_id ? (
              <span className="adm-muted small">public_id: {img.public_id}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


/** Редактор слайдера (мультизагрузка, точечная перезагрузка, ALT, перенос, удаление, drag&drop) */
function ImageSliderEditor({ block, onChange }) {
  const images = Array.isArray(block.data?.images) ? block.data.images : [];
  const [progressMap, setProgressMap] = React.useState({});
  const [uploadingIdx, setUploadingIdx] = React.useState(null);

  const setImages = (next) =>
    onChange({ data: { ...block.data, images: next } });

  const handleAddEmpty = () =>
    setImages([...images, { url: "", alt: "", public_id: "" }]);

  const handleUploadMany = async (fileList) => {
    try {
      const files = Array.from(fileList || []);
      if (!files.length) return;

      const added = await uploadManyToCloudinary(
        files,
        { folder: "categories/sliders" },
        (fileIdx, percent) => {
          setProgressMap((prev) => ({ ...prev, [`file_${fileIdx}`]: percent }));
        }
      );

      setImages([...images, ...added]);
      setProgressMap({});
    } catch (e) {
      console.error(e);
      alert("Не удалось загрузить изображения");
    }
  };

  const handleUploadSingleToIndex = async (file, index) => {
    try {
      setUploadingIdx(index);
      setProgressMap((p) => ({ ...p, [index]: 0 }));

      const sig = await getSignature({ folder: "categories/sliders" }).catch(
        () => getSignature({})
      );

      const meta = await uploadFileToCloudinary(file, sig, (p) =>
        setProgressMap((prev) => ({ ...prev, [index]: p }))
      );

      const next = [...images];
      next[index] = {
        ...(next[index] || {}),
        url: meta.secure_url,
        public_id: meta.public_id,
      };
      setImages(next);
    } catch (e) {
      console.error(e);
      alert("Загрузка не удалась");
    } finally {
      setUploadingIdx(null);
      setProgressMap((p) => ({ ...p, [index]: 0 }));
    }
  };

  const updateAlt = (i, alt) => {
    const next = [...images];
    next[i] = { ...next[i], alt };
    setImages(next);
  };

  const updateUrl = (i, url) => {
    const next = [...images];
    next[i] = { ...next[i], url };
    setImages(next);
  };

  const removeAt = (i) => setImages(images.filter((_, k) => k !== i));

  const move = (from, to) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    setImages(next);
  };

  /** drag&drop зона для массовой загрузки */
  const dropRef = useRef(null);
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e) => e.preventDefault();
    const onDrop = (e) => {
      e.preventDefault();
      const fl = e.dataTransfer?.files;
      if (fl?.length) handleUploadMany(fl);
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("drop", onDrop);
    };
  }, []); // eslint-disable-line

  return (
    <div className="blk-body">
      <label className="adm-label">Слайдер: изображения</label>

      {/* Массовая загрузка + dnd */}
      <div className="img-row" style={{ alignItems: "center", gap: 12 }}>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleUploadMany(e.target.files)}
        />
        <span className="adm-muted">
          Можно выбрать несколько файлов сразу или перетащить в область ниже
        </span>
      </div>

      <div
        ref={dropRef}
        style={{
          margin: "8px 0 12px",
          padding: 12,
          border: "1px dashed #cfd8dc",
          borderRadius: 8,
          fontSize: 13,
          color: "#607d8b",
        }}
      >
        Перетащи сюда изображения для массовой загрузки
        {/* прогресс по пакету */}
        {Object.keys(progressMap).some((k) => k.startsWith("file_")) && (
          <div className="adm-progress" style={{ marginTop: 8 }}>
            {Math.round(
              Object.values(progressMap).reduce((a, b) => a + (b || 0), 0) /
                Math.max(1, Object.keys(progressMap).length)
            )}
            %
          </div>
        )}
      </div>

      {/* Список изображений */}
      {images.map((img, i) => (
        <div className="img-row" key={i}>
          {/* Превью */}
          {img?.url ? (
            <img
              src={img.url}
              alt=""
              style={{
                width: 80,
                height: 48,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />
          ) : (
            <div
              style={{
                width: 80,
                height: 48,
                background: "#eee",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "#666",
              }}
            >
              нет
            </div>
          )}

          {/* Поле URL */}
          <input
            className="adm-input"
            style={{ flex: 1 }}
            placeholder="Image URL"
            value={img.url || ""}
            onChange={(e) => updateUrl(i, e.target.value)}
          />

          {/* ALT */}
          <input
            className="adm-input"
            style={{ width: 220 }}
            placeholder="ALT"
            value={img.alt || ""}
            onChange={(e) => updateAlt(i, e.target.value)}
          />

          {/* Точечная загрузка */}
          <label className="adm-mini">
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadSingleToIndex(f, i);
              }}
            />
            Загрузить
          </label>

          {/* Переместить */}
          <button
            className="adm-mini"
            onClick={() => move(i, i - 1)}
            title="Вверх"
          >
            ↑
          </button>
          <button
            className="adm-mini"
            onClick={() => move(i, i + 1)}
            title="Вниз"
          >
            ↓
          </button>

          {/* Удалить */}
          <button className="adm-mini danger" onClick={() => removeAt(i)}>
            Удалить
          </button>

          {/* Прогресс для точечной загрузки */}
          {progressMap[i] > 0 && progressMap[i] < 100 && (
            <span className="adm-progress">{progressMap[i]}%</span>
          )}

          {/* Показать public_id (если есть) */}
          {img.public_id ? (
            <span className="adm-muted small" style={{ marginLeft: 8 }}>
              {img.public_id}
            </span>
          ) : null}
        </div>
      ))}

      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="adm-mini" onClick={handleAddEmpty}>
          + Добавить пустую строку
        </button>
        <span className="adm-muted small">
          Поддерживается перезалив конкретного кадра, массовая загрузка и
          drag&drop.
        </span>
      </div>
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
      case "image":
  return "Изображение";
    default:
      return type;
  }
}
