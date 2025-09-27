import React, { useMemo, useState } from "react";

/* ✅ без лишнего пробела в пути */
import "/src/blocks/ popularCategory/Popularcategory.css";

import firstcatImg from "/src/assets/icons/popularcategory/на воде 1.png";
import secondcatImg from "/src/assets/icons/popularcategory/премиум.png";
import thirdcatImg from "/src/assets/icons/popularcategory/экстрим.png";
import fourcatImg from "/src/assets/icons/popularcategory/Object.png";
import fivecatImg from "/src/assets/icons/popularcategory/с детьми.png";
import sixcatImg from "/src/assets/icons/popularcategory/развлечения.png";

/* дефолт для карточек, если у айтема нет своей картинки */
const DEFAULT_CARD_IMG = "/src/assets/icons/popularcategory/Image-test.png";

const CATEGORIES = [
  { id: "water",   label: "На воде",      icon: firstcatImg,  bg: "#fff", color: "#000" },
  { id: "premium", label: "Premium",      icon: secondcatImg, bg: "linear-gradient(to bottom,#000001,#424242)", color: "#FAB92E" },
  { id: "extreme", label: "Экстрим",      icon: thirdcatImg,  bg: "#fff", color: "#000" },
  { id: "walk",    label: "Пешком",       icon: fourcatImg,   bg: "#fff", color: "#000" },
  { id: "kids",    label: "С детьми",     icon: fivecatImg,   bg: "#fff", color: "#000" },
  { id: "fun",     label: "Развлечения",  icon: sixcatImg,    bg: "#fff", color: "#000" },
];

const CONTENT = {
  water:   [{ title: "Прогулка на теплоходе\nпо Телецкому озеру" }, { title: "Прогулка на катере\nи рыбалка" }],
  premium: [{ title: "VIP круиз\nс дегустацией" }, { title: "Частная яхта\nна закате" }],
  extreme: [{ title: "Рафтинг\nрека Катунь" }, { title: "Джип-тур\nпо перевалам" }],
  walk:    [{ title: "Треккинг\nгорные озера" }, { title: "Пешая экскурсия\nпо селу" }],
  kids:    [{ title: "Семейная велопрогулка" }, { title: "Верёвочный парк" }],
  fun:     [{ title: "Квадро-сафари" }, { title: "Баня на дровах\nи чан" }],
};

const chipStyle = (c) => ({
  ...(typeof c.bg === "string" && c.bg.trim().startsWith("linear-gradient")
    ? { background: c.bg }
    : { backgroundColor: c.bg }),
  color: c.color,
});

export default function Popularcategory() {
  const [active, setActive] = useState(CATEGORIES[0].id);
  const items = useMemo(() => CONTENT[active] ?? [], [active]);

  const normalizeTitle = (t) => (t || "").replace(/\\n|\/n|n\//g, "\n");

  return (
    <div className="wrap">
      <header className="head">
        <span className="star">★</span>
        <h2>Самое популярное</h2>
      </header>

      {/* чипы */}
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

      {/* карточки */}
      <div className="cards" key={active} data-anim="slide">
        {items.slice(0, 2).map((it, idx) => {
          const src = it.image || DEFAULT_CARD_IMG; // можно добавить поле image у айтема
          return (
            <article
              key={idx}
              className="card"
              style={{ backgroundImage: `url(${src})` }}   /* ← фон картинкой */
            >
              <div className="card__overlay">
                <h3 className="card__title">{normalizeTitle(it.title)}</h3>
              </div>
              <button className="card__cta" aria-label="Открыть">→</button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
