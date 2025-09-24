import { useRef } from "react";
import "/src/components/slimcategory/slimCategory.css";

const DEFAULT_CATEGORIES = [
  { label: "Новости",        icon: "/src/assets/icons/icon-doc.svg" },
  { label: "Погода",         icon: "/src/assets/icons/icon-cloud.svg" },
  { label: "Скидки города",  icon: "/src/assets/icons/icon-sale.svg" },
  { label: "Авторемонт",     icon: "/src/assets/icons/icon-car.svg" },
  { label: "Банкоматы",      icon: "/src/assets/icons/icon-money.svg" },
  { label: "Аптеки",         icon: "/src/assets/icons/icon-pharm.svg" },
  { label: "Церкви и храмы", icon: "/src/assets/icons/icon-church.svg" },
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
