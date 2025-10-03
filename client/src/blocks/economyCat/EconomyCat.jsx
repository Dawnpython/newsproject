import React, { useMemo, useState } from "react";
import "/src/blocks/economyCat/EconomyCat.css";

// Иконки
import icoPopular from "/src/assets/icons/economy/economyicon1.svg";
import icoTours   from "/src/assets/icons/economy/economyicon2.svg";
import icoFood    from "/src/assets/icons/economy/economyicon3.svg";
import icoShops   from "/src/assets/icons/economy/economyicon4.svg";
import icoHotels  from "/src/assets/icons/economy/economyicon5.svg";
import icoOther   from "/src/assets/icons/economy/economyicon6.svg";

// Фото
import img1 from "/src/assets/economy/1.jpg";
import img2 from "/src/assets/economy/2.jpg";
import img3 from "/src/assets/economy/3.jpg";

// Категории
const CATEGORIES = [
  { id: "popular", label: "Популярные", icon: icoPopular },
  { id: "tours",   label: "Экскурсии",  icon: icoTours   },
  { id: "food",    label: "Еда",        icon: icoFood    },
  { id: "shops",   label: "Магазины",   icon: icoShops   },
  { id: "hotels",  label: "Отели",      icon: icoHotels  },
  { id: "other",   label: "Другое",     icon: icoOther   },
];

// Контент (оставляем только картинки и ссылки)
const CONTENT = {
  popular: [
    { img: img1, link: "#" },
    { img: img2, link: "#" },
    { img: img3, link: "#" },
  ],
  tours: [
    { img: img1, link: "#" },
    { img: img2, link: "#" },
    { img: img3, link: "#" },
  ],
  food: [
    { img: img1, link: "#" },
    { img: img2, link: "#" },
    { img: img3, link: "#" },
  ],
  shops: [
    { img: img1, link: "#" },
    { img: img2, link: "#" },
    { img: img3, link: "#" },
  ],
  hotels: [
    { img: img1, link: "#" },
    { img: img2, link: "#" },
    { img: img3, link: "#" },
  ],
  other: [
    { img: img1, link: "#" },
    { img: img2, link: "#" },
    { img: img3, link: "#" },
  ],
};

export default function EconomyCat() {
  const [active, setActive] = useState(CATEGORIES[1].id);
  const items = useMemo(() => CONTENT[active] ?? [], [active]);

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
        {items.slice(0, 3).map((it, i) => (
          <a key={i} className="eco-story" href={it.link}>
            <img src={it.img} alt="" className="eco-story__img" />
          </a>
        ))}
      </div>
    </section>
  );
}
