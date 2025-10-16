// /src/pages/categorygenpage/Categorygenpage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import "/src/pages/categorygenpage/Categorygenpage.css";
import Pr from "/src/blocks/pr/Pr.jsx";

const API_BASE = "https://newsproject-tnkc.onrender.com";

export default function Categorygenpage(props) {
  const params = useParams();
  const location = useLocation();
  const fromStateSlug = location?.state?.slug;
  const fromPropSlug = props?.slug;

  const slug = (params?.slug || fromStateSlug || fromPropSlug || "").trim();

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_BASE}/page/${slug}`);
        if (!res.ok) throw new Error(`fetch_failed_${slug}`);
        const data = await res.json();
        if (alive) setPage(data);
      } catch (e) {
        console.error(e);
        if (alive) setErr("Не удалось загрузить страницу");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (!slug)
    return (
      <div className="p-wrap">
        <div className="p-error">Не передан slug</div>
      </div>
    );
  if (loading)
    return (
      <div className="p-wrap">
        <div className="p-skeleton">Загрузка…</div>
      </div>
    );
  if (err)
    return (
      <div className="p-wrap">
        <div className="p-error">{err}</div>
      </div>
    );
  if (!page?.category)
    return (
      <div className="p-wrap">
        <div className="p-error">Страница не найдена</div>
      </div>
    );

  const { category, article } = page;
  const blocks = Array.isArray(article?.content_json) ? article.content_json : [];

  return (
    <div className="p-wrap">
      {/* HERO */}
      <section
        className="p-hero"
        style={{
          backgroundImage: category.cover_url ? `url(${category.cover_url})` : undefined,
        }}
      >
        <div className="p-hero__overlay" />
        <div className="p-hero__text">
          <h1>{category.title || category.label || slug}</h1>
          {category.subtitle ? <p>{category.subtitle}</p> : null}
        </div>
      </section>

      {/* Блоки */}
      <section className="p-body">
        {blocks.map((b, i) => (
          <BlockRenderer key={`${b.type}-${i}`} block={b} />
        ))}
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

/* ===== РЕНДЕР БЛОКОВ ===== */
function BlockRenderer({ block }) {
  const type = block?.type;
  const data = block?.data || {};

  // text_block
  if (type === "text_block" || type === "text") {
    const text = data.text || "";
    return (
      <div className="p-card p-textblock">
        <div
          className="p-text"
          dangerouslySetInnerHTML={{
            __html: nl2br(escapeHtml(text)),
          }}
        />
      </div>
    );
  }

  // image
  if (type === "image") {
    const { url, alt } = data || {};
    if (!url) return null;
    return (
      <div className="p-card p-image">
        <img src={url} alt={alt || ""} />
        {alt ? <div className="p-imgcap">{alt}</div> : null}
      </div>
    );
  }

  // image_slider — теперь отдельный компонент с хуками
  if (type === "image_slider") {
    const images = Array.isArray(data.images) ? data.images.filter((x) => x?.url) : [];
    if (!images.length) return null;
    return <ImageSlider images={images} />;
  }

  // ad_block
  if (type === "ad_block") {
    return (
      <div className="p-card p-ad">
        <Pr />
      </div>
    );
  }

  // template_block
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

  // fallback
  return (
    <div className="p-card">
      <p>Неизвестный блок: {type}</p>
    </div>
  );
}

/* ===== СЛАЙДЕР ===== */
function ImageSlider({ images }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef(null);

  // активная точка — по положению скролла на ширину окна
  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.clientWidth; // = 100vw из CSS
    // центр экрана: учитываем половину ширины, чтобы срабатывал ближний слайд
    const idx = Math.round(el.scrollLeft / w);
    const clamped = Math.max(0, Math.min(idx, images.length - 1));
    if (clamped !== active) setActive(clamped);
  };

  // при ресайзе корректно пересчитать активный
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const handler = () => onScroll();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-card p-slider">
      <div className="p-slider__track" ref={trackRef} onScroll={onScroll}>
        {images.map((img, i) => (
          <div className="p-slider__slide" key={img.public_id || img.url || i}>
            <img src={img.url} alt={img.alt || ""} loading="lazy" />
          </div>
        ))}
      </div>

      <div className="p-slider__dots" aria-hidden>
        {images.map((_, i) => (
          <span key={i} className={`dot ${i === active ? "active" : ""}`} />
        ))}
      </div>
    </div>
  );
}

/* === Утилиты === */
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
