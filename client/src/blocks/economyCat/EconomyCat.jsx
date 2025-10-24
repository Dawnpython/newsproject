import React, { useMemo, useState, useEffect } from "react";
import "/src/blocks/economyCat/EconomyCat.css";

// Иконки
import icoPopular from "/src/assets/icons/economy/economyicon1.svg";
import icoTours   from "/src/assets/icons/economy/economyicon2.svg";
import icoFood    from "/src/assets/icons/economy/economyicon3.svg";
import icoShops   from "/src/assets/icons/economy/economyicon4.svg";
import icoHotels  from "/src/assets/icons/economy/economyicon5.svg";
import icoOther   from "/src/assets/icons/economy/economyicon6.svg";

const API_BASE = "https://newsproject-tnkc.onrender.com";

const CATEGORIES = [
  { id: "popular", label: "Популярные", icon: icoPopular },
  { id: "tours",   label: "Экскурсии",  icon: icoTours   },
  { id: "food",    label: "Еда",        icon: icoFood    },
  { id: "shops",   label: "Магазины",   icon: icoShops   },
  { id: "hotels",  label: "Отели",      icon: icoHotels  },
  { id: "other",   label: "Другое",     icon: icoOther   },
];

export default function EconomyCat() {
  const [active, setActive] = useState(CATEGORIES[0].id);
  const [data, setData] = useState({});     // { sectionId: [items] }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_BASE}/economy`);
        if (!r.ok) throw new Error("economy_fetch_failed");
        const json = await r.json();
        if (alive) setData(json || {});
      } catch (e) {
        console.error(e);
        if (alive) setData({});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const items = useMemo(() => {
    const raw = Array.isArray(data[active]) ? data[active] : [];
    // маппинг под старую структуру (img+link) и срез до трёх
    return raw.slice(0, 3).map((it) => ({
      img: it.image_url,
      link: it.link_type === "category"
        ? `/c/${it.link_slug}`
        : (it.link_url || "#"),
      title: it.title || "",
    }));
  }, [data, active]);

  return (
    <section className="eco-section">
      <header className="eco-header">
        <h2 className="eco-title">Хочешь сэкономить?</h2>
        <p className="eco-subtitle">Акции и купоны от местных</p>
      </header>

      <div className="eco-tabs" role="tablist" aria-label="Категории">
        {CATEGORIES.map((c) => {
          const isActive = c.id === active;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={isActive}
              className={"eco-tab" + (isActive ? " eco-tab--active" : "")}
              onClick={() => setActive(c.id)}
              title={c.label}
            >
              <img className="eco-tab__icon" src={c.icon} alt={c.label} />
              <span className="eco-tab__label">{c.label}</span>
            </button>
          );
        })}
      </div>

      <div className="eco-stories" data-anim="slide" key={active}>
        {loading && (!data[active] || data[active].length === 0) && (
          <>
            <div className="eco-story skeleton" />
            <div className="eco-story skeleton" />
            <div className="eco-story skeleton" />
          </>
        )}

        {items.map((it, i) => (
          <a key={i} className="eco-story" href={it.link} title={it.title}>
            <img src={it.img} alt={it.title || ""} className="eco-story__img" />
          </a>
        ))}

        {!loading && items.length === 0 && (
          <div className="eco-empty">Скоро здесь появятся предложения</div>
        )}
      </div>
    </section>
  );
}
