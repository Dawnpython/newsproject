import { useRef } from "react";
import "/src/components/slimcategory/slimCategory.css";

const DEFAULT_CATEGORIES = [
  { label: "Новости",        icon: "/src/public/hero.png" },
  { label: "Погода",         icon: "/src/public/icon-cloud.svg" },
  { label: "Скидки города",  icon: "/src/public/icon-sale.svg" },
  { label: "Авторемонт",     icon: "/src/public/icon-car.svg" },
  { label: "Банкоматы",      icon: "/src/public/icon-money.svg" },
  { label: "Аптеки",         icon: "/src/public/icon-pharm.svg" },
  { label: "Церкви и храмы", icon: "/src/public/icon-church.svg" },
];

export default function SlimCategory({ items = DEFAULT_CATEGORIES, onSelect }) {
  const trackRef = useRef(null);

  return (
    <div className="cat-carousel">
      <div className="cat-track" ref={trackRef}>
        {items.map(({ label, icon }) => (
          <button
            key={label}
            type="button"
            className="cat-chip"
            onClick={() => onSelect?.(label)}
            aria-label={label}
          >
            <img className="cat-chip__icon" src={icon} alt="" aria-hidden />
            <span className="cat-chip__label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
