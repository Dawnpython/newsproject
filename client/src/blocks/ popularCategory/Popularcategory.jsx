import React, { useEffect, useMemo, useState } from "react";

import "/src/blocks/ popularCategory/Popularcategory.css";

import firstcatImg from "/src/assets/icons/popularcategory/на воде 1.png";
import secondcatImg from "/src/assets/icons/popularcategory/премиум.png";
import thirdcatImg from "/src/assets/icons/popularcategory/экстрим.png";
import fourcatImg from "/src/assets/icons/popularcategory/Object.png";
import fivecatImg from "/src/assets/icons/popularcategory/с детьми.png";
import sixcatImg from "/src/assets/icons/popularcategory/развлечения.png";

const API_BASE = "https://newsproject-dx8n.onrender.com";
const API = { popular: `${API_BASE}/popular` };

const CATEGORIES = [
  { id: "water",   label: "На воде",      icon: firstcatImg,  bg: "#fff", color: "#000" },
  { id: "premium", label: "Premium",      icon: secondcatImg, bg: "linear-gradient(to bottom, #000001, #424242)", color: "#FAB92E" },
  { id: "extreme", label: "Экстрим",      icon: thirdcatImg,  bg: "#fff", color: "#000" },
  { id: "walk",    label: "Пешком",       icon: fourcatImg,   bg: "#fff", color: "#000" },
  { id: "kids",    label: "С детьми",     icon: fivecatImg,   bg: "#fff", color: "#000" },
  { id: "fun",     label: "Развлечения",  icon: sixcatImg,    bg: "#fff", color: "#000" },
];

const chipStyle = (c) => ({
  ...(typeof c.bg === "string" && c.bg.trim().startsWith("linear-gradient")
    ? { background: c.bg }
    : { backgroundColor: c.bg }),
  color: c.color,
});

export default function Popularcategory() {
  const [active, setActive] = useState(CATEGORIES[0].id);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  // грузим текущую секцию
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API.popular}?section=${active}`);
        const json = await r.json();
        if (!alive) return;
        setData((prev) => ({
          ...prev,
          [active]: Array.isArray(json?.[active]) ? json[active] : [],
        }));
      } catch {
        if (!alive) return;
        setData((prev) => ({ ...prev, [active]: [] }));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [active]);

  const items = useMemo(() => (data[active] || []).slice(0, 2), [data, active]);

  const normalizeMultiline = (t) => (t || "").replace(/\\n|\/n|n\//g, "\n");

  return (
    <div className="wrap">
      <header className="head">
        <span className="star">★</span>
        <h2>Самое популярное</h2>
      </header>

      <div className="slider" role="tablist" aria-label="Категории">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={active === c.id}
            className={"chip" + (active === c.id ? " chip--active" : "")}
            onClick={() => setActive(c.id)}
            style={chipStyle(c)}
          >
            <img src={c.icon} alt={c.label} className="chip__icon" />
            <span className="chip__label">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="cards" key={active} data-anim="slide">
        {loading && !(data[active]?.length) && (
          <div className="loading">Загрузка…</div>
        )}

        {items.map((it) => (
          <article key={it.id} className="card">
            <div
              className="card__bg"
              style={
                it.image_url ? { backgroundImage: `url(${it.image_url})` } : undefined
              }
            />
            <div className="card__overlay">
              <h3 className="card__title">{normalizeMultiline(it.title)}</h3>
              {it.description && (
                <p className="card__desc">
                  {normalizeMultiline(it.description)}
                </p>
              )}
            </div>
            <a className="card__cta" aria-label="Открыть" href={`/c/${it.link_slug}`}>
              →
            </a>
          </article>
        ))}

        {!loading && !(data[active]?.length) && (
          <p className="empty">Пока пусто</p>
        )}
      </div>
    </div>
  );
}
