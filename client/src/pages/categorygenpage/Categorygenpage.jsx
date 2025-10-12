import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import "/src/pages/categorygenpage/Categorygenpage.css";

// Бек на Render:
const API_BASE = "https://newsproject-tnkc.onrender.com";

export default function Categorygenpage(props) {
  // 1) из URL: /c/:slug
  const params = useParams();
  // 2) из navigation state (если кнопка передала)
  const location = useLocation();
  const fromStateSlug = location?.state?.slug;
  // 3) из пропсов (на всякий)
  const fromPropSlug = props?.slug;

  const slug = (params?.slug || fromStateSlug || fromPropSlug || "").trim();

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_BASE}/page/${slug}`);
        if (!res.ok) throw new Error(`fetch_failed_${slug}`);
        const data = await res.json();
        setPage(data);
      } catch (e) {
        console.error(e);
        setErr("Не удалось загрузить страницу");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (!slug) return <div className="p-wrap"><div className="p-error">Не передан slug</div></div>;
  if (loading) return <div className="p-wrap"><div className="p-skeleton">Загрузка…</div></div>;
  if (err) return <div className="p-wrap"><div className="p-error">{err}</div></div>;
  if (!page?.category) return <div className="p-wrap"><div className="p-error">Страница не найдена</div></div>;

  const { category, article } = page;
  const blocks = Array.isArray(article?.content_json) ? article.content_json : [];

  return (
    <div className="p-wrap">
      {/* HERO */}
      <section className="p-hero" style={{ backgroundImage: category.cover_url ? `url(${category.cover_url})` : undefined }}>
        <div className="p-hero__overlay" />
        <div className="p-hero__text">
          <h1>{category.title || category.label || slug}</h1>
          {category.subtitle ? <p>{category.subtitle}</p> : null}
        </div>
      </section>

      {/* Блоки */}
      <section className="p-body">
        {blocks.map((b, i) => <BlockRenderer key={i} block={b} />)}
        {blocks.length === 0 && (
          <div className="p-card">
            <h3>Пока пусто</h3>
            <p>Добавь контент в админке для “{category.label || slug}”.</p>
          </div>
        )}
      </section>
    </div>
  );
}

/* ===== РЕНДЕР БЛОКОВ: поддержка text, image, image_slider, ad_block, template_block ===== */
function BlockRenderer({ block }) {
  const type = block?.type;
  const data = block?.data || {};

  if (type === "text") {
    const text = data.text || "";
    return (
      <div className="p-card">
        <div className="p-text" dangerouslySetInnerHTML={{ __html: nl2br(escapeHtml(text)) }} />
      </div>
    );
  }

  if (type === "image") {
    const { url, alt } = data;
    if (!url) return null;
    return (
      <div className="p-card p-image">
        <img src={url} alt={alt || ""} />
        {alt ? <div className="p-imgcap">{alt}</div> : null}
      </div>
    );
  }

  if (type === "image_slider") {
    const images = Array.isArray(data.images) ? data.images : [];
    if (!images.length) return null;
    return (
      <div className="p-card">
        <div className="p-slider">
          {images.map((img, i) => (
            <img key={i} src={img.url} alt={img.alt || ""} />
          ))}
        </div>
      </div>
    );
  }

  if (type === "ad_block") {
    return (
      <div className="p-card p-ad">
        <div className="p-ad__badge">Реклама</div>
        <div className="p-ad__content">
          <strong>Промо от партнёра</strong>
          <p>Здесь будет баннер/виджет.</p>
        </div>
      </div>
    );
  }

  if (type === "template_block") {
    return (
      <div className="p-card">
        <h3>Шаблонный блок</h3>
        <ul className="p-list">
          <li>Пункт 1</li>
          <li>Пункт 2</li>
          <li>Пункт 3</li>
        </ul>
      </div>
    );
  }

  return null;
}

/* утилы для безопасного текста */
function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function nl2br(str = "") {
  return str.replaceAll("\n", "<br/>");
}
