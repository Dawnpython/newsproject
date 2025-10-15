import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import "/src/pages/categorygenpage/Categorygenpage.css";
import Pr from "/src/blocks/pr/Pr.jsx";

const API_BASE = "https://newsproject-tnkc.onrender.com";

/* ========= Универсальный слайдер ========== */
function ImageSlider({
  images = [],
  aspectRatio = "16/9",
  autoPlay = true,
  autoPlayMs = 4000,
}) {
  const [idx, setIdx] = useState(0);
  const wrapRef = useRef(null);
  const pointerRef = useRef({ x: 0, active: false, moved: false });
  const timerRef = useRef(null);
  const count = images.length;

  const clamp = (n) => Math.max(0, Math.min(n, count - 1));
  const go = (n) => setIdx((i) => clamp(n ?? i));
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  // autoplay
  useEffect(() => {
    if (!autoPlay || count <= 1) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % count);
    }, autoPlayMs);
    return () => clearInterval(timerRef.current);
  }, [autoPlay, autoPlayMs, count]);

  // pause on hover
  const pause = () => clearInterval(timerRef.current);
  const resume = () => {
    if (!autoPlay || count <= 1) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % count);
    }, autoPlayMs);
  };

  // keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.matches(":hover, :focus-within")) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, count]);

  // swipe
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onPointerDown = (e) => {
      pointerRef.current = { x: e.clientX ?? e.touches?.[0]?.clientX ?? 0, active: true, moved: false };
      pause();
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp, { once: true });
    };
    const onPointerMove = (e) => {
      if (!pointerRef.current.active) return;
      const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const dx = x - pointerRef.current.x;
      if (Math.abs(dx) > 8) pointerRef.current.moved = true;
    };
    const onPointerUp = (e) => {
      const x = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
      const dx = x - pointerRef.current.x;
      if (pointerRef.current.moved) {
        if (dx < -40) next();
        else if (dx > 40) prev();
      }
      pointerRef.current = { x: 0, active: false, moved: false };
      resume();
      window.removeEventListener("pointermove", onPointerMove);
    };

    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [idx, count]);

  if (count === 0) return null;

  return (
    <div
      className="p-slider"
      ref={wrapRef}
      onMouseEnter={pause}
      onMouseLeave={resume}
      role="region"
      aria-roledescription="carousel"
      aria-label="Галерея изображений"
    >
      <div
        className="p-slider__viewport"
        style={{
          aspectRatio,
        }}
      >
        <div
          className="p-slider__track"
          style={{
            width: `${count * 100}%`,
            transform: `translateX(-${(100 / count) * idx}%)`,
          }}
        >
          {images.map((img, i) => (
            <div className="p-slider__slide" key={i} aria-hidden={i !== idx}>
              <img
                src={img.url}
                alt={img.alt || ""}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
              />
              {img.alt ? <div className="p-slider__caption">{img.alt}</div> : null}
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            className="p-slider__nav prev"
            aria-label="Предыдущее"
            onClick={prev}
          >
            ‹
          </button>
          <button
            className="p-slider__nav next"
            aria-label="Следующее"
            onClick={next}
          >
            ›
          </button>

          <div className="p-slider__dots" aria-hidden>
            {images.map((_, i) => (
              <button
                key={i}
                className={`dot ${i === idx ? "active" : ""}`}
                onClick={() => go(i)}
                tabIndex={-1}
                aria-label={`К слайду ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
/* ========= конец слайдера ========== */

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
          <BlockRenderer key={i} block={b} />
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

  /** === Текстовый блок (text_block) === */
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

  /** === Изображение === */
  if (type === "image") {
    const { url, alt } = data;
    if (!url) return null;
    return (
      <div className="p-card p-image">
        <img src={url} alt={alt || ""} loading="lazy" decoding="async" />
        {alt ? <div className="p-imgcap">{alt}</div> : null}
      </div>
    );
  }

  /** === Слайдер изображений === */
  if (type === "image_slider") {
    const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
    if (!images.length) return null;
    return (
      <div className="p-card">
        <ImageSlider images={images} aspectRatio="16/9" />
      </div>
    );
  }

  /** === Рекламный блок === */
  if (type === "ad_block") {
    return (
      <div className="p-card p-ad">
        <Pr />
      </div>
    );
  }

  /** === Шаблонный блок === */
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

  /** === fallback === */
  return (
    <div className="p-card">
      <p>Неизвестный блок: {type}</p>
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
