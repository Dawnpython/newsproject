import React, { useMemo, useState } from "react";
import "/src/blocks/economyCat/EconomyCat.css"; // без пробелов в пути!

// Иконки
import icoPopular from "/src/assets/icons/economy/economyicon1.svg";
import icoTours   from "/src/assets/icons/economy/economyicon2.svg";
import icoFood    from "/src/assets/icons/economy/economyicon3.svg";
import icoShops   from "/src/assets/icons/economy/economyicon4.svg";
import icoHotels  from "/src/assets/icons/economy/economyicon5.svg";
import icoOther   from "/src/assets/icons/economy/economyicon6.svg";

// Категории
const CATEGORIES = [
  { id: "popular", label: "Популярные", icon: icoPopular },
  { id: "tours",   label: "Экскурсии",  icon: icoTours   },
  { id: "food",    label: "Еда",        icon: icoFood    },
  { id: "shops",   label: "Магазины",   icon: icoShops   },
  { id: "hotels",  label: "Отели",      icon: icoHotels  },
  { id: "other",   label: "Другое",     icon: icoOther   },
];

// Контент (поставь свои пути/ссылки)
const CONTENT = {
  popular: [
    { title: "Будь с нами",   subtitle: "тур по горам",  img: "src/assets/economy/1.jpg", link: "#" },
    { title: "Йога на Алтае", subtitle: "16–23 мая",     img: "src/assets/economy/2.jpg", link: "#" },
    { title: "Байкал 5 дней", subtitle: "65 000 ₽",      img: "src/assets/economy/3.jpg", link: "#" },
  ],
  tours: [
    { title: "Покатушки",     subtitle: "квадроциклы",   img: "src/assets/economy/1.jpg", link: "#" },
    { title: "Рафтинг",       subtitle: "река Катунь",   img: "src/assets/economy/2.jpg", link: "#" },
    { title: "Треккинг",      subtitle: "горные озёра",  img: "src/assets/economy/3.jpg", link: "#" },
  ],
  food: [
    { title: "Сеты 1+1",      subtitle: "суши-бар",      img: "src/assets/economy/1.jpg", link: "#" },
    { title: "Бургер-дело",   subtitle: "−20% на ланч",  img: "src/assets/economy/2.jpg", link: "#" },
    { title: "Кофе по утрам", subtitle: "2-й в подарок",  img: "src/assets/economy/3.jpg", link: "#" },
  ],
  shops: [
    { title: "Локальные",     subtitle: "купон на 500",  img: "src/assets/economy/1.jpg", link: "#" },
    { title: "Эко-сувениры",  subtitle: "−15%",          img: "src/assets/economy/2.jpg", link: "#" },
    { title: "Тёплые вещи",   subtitle: "межсезонье −30%", img: "src/assets/economy/3.jpg", link: "#" },
  ],
  hotels: [
    { title: "Spa weekend",   subtitle: "джакузи + завтрак", img: "src/assets/economy/1.jpg", link: "#" },
    { title: "ДОМ У РЕКИ",    subtitle: "будни −25%",        img: "src/assets/economy/2.jpg", link: "#" },
    { title: "Кемпинг",       subtitle: "мангал включён",    img: "src/assets/economy/3.jpg", link: "#" },
  ],
  other: [
    { title: "Верёвочный парк", subtitle: "семейный",     img: "src/assets/economy/1.jpg", link: "#" },
    { title: "Баня на дровах",  subtitle: "и чан",        img: "src/assets/economy/2.jpg", link: "#" },
    { title: "Фототур",         subtitle: "на закате",    img: "src/assets/economy/3.jpg", link: "#" },
  ],
};

export default function EconomyCat() {
  const [active, setActive] = useState(CATEGORIES[1].id); // по макету — “Экскурсии”
  const items = useMemo(() => CONTENT[active] ?? [], [active]);

  return (
    <section className="eco-section">
      <header className="eco-header">
        <h2 className="eco-title">Хочешь сэкономить?</h2>
        <p className="eco-subtitle">Акции и купоны от местных</p>
      </header>

      <div className="eco-tabs" role="tablist" aria-label="Категории">
        {CATEGORIES.map(c => {
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
              <img className="eco-tab__icon" src={c.icon} alt="" />
              <span className="eco-tab__label">{c.label}</span>
            </button>
          );
        })}
      </div>

      <div className="eco-stories" key={active}>
        {items.slice(0, 3).map((it, i) => (
          <a
            key={i}
            className="eco-story"
            href={it.link}
            style={{ backgroundImage: `url(${it.img})` }}
          >
            <div className="eco-story__fade" />
            <div className="eco-story__text">
              <div className="eco-story__title">{it.title}</div>
              {it.subtitle && <div className="eco-story__subtitle">{it.subtitle}</div>}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
