import { useRef } from "react";
import "/src/components/slimcategory/slimCategory.css";

const DEFAULT_CATEGORIES = [
  { label: "Новости",        icon: "/assets/icon-doc.svg" },
  { label: "Погода",         icon: "/assets/icon-cloud.svg" },
  { label: "Скидки города",  icon: "/assets/icon-sale.svg" },
  { label: "Авторемонт",     icon: "/assets/icon-car.svg" },
  { label: "Банкоматы",      icon: "/assets/logo.png" },
  { label: "Аптеки",         icon: "/assets/icon-pharm.svg" },
  { label: "Церкви и храмы", icon: "/assets/icon-church.svg" },
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
