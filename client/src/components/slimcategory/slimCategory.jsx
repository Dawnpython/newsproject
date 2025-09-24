import { useRef } from "react";
import "/src/components/slimcategory/slimCategory.css";

import iconCloud from '/src/assets/icon-cloud.svg'

const DEFAULT_CATEGORIES = [
  { label: "Новости",        icon: "/src/assets/hero.png" },
  { label: "Погода",         icon: iconCloud },
  { label: "Скидки города",  icon: "/src/assets/icon-sale.svg" },
  { label: "Авторемонт",     icon: "/src/assets/icon-car.svg" },
  { label: "Банкоматы",      icon: "/src/assets/icon-money.svg" },
  { label: "Аптеки",         icon: "/src/assets/icon-pharm.svg" },
  { label: "Церкви и храмы", icon: "/src/assets/icon-church.svg" },
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
