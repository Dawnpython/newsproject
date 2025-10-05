import { useRef } from "react";
import "/src/components/slimcategory/slimCategory.css";

import iconNews from '/src/assets/icons/slimcategory/icon-doc.png'
import iconCloud from '/src/assets/icons/slimcategory/icon-cloud.png'
import iconSale from '/src/assets/icons/slimcategory/icon-sale.png'
import iconCar from '/src/assets/icons/slimcategory/icon-car.png'
import iconBank from '/src/assets/icons/slimcategory/icon-money.png'
import iconFarm from '/src/assets/icons/slimcategory/icon-pharm.png'
import iconChuch from '/src/assets/icons/slimcategory/icon-church.png'

const DEFAULT_CATEGORIES = [
  { label: "Новости",        icon: iconNews },
  { label: "Погода",         icon: iconCloud },
  { label: "Скидки города",  icon: iconSale},
  { label: "Авторемонт",     icon: iconCar},
  { label: "Банкоматы",      icon: iconBank },
  { label: "Аптеки",         icon: iconFarm },
  { label: "Церкви и храмы", icon: iconChuch },
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
            <img className="cat-chip__icon" style={{width:12}} src={icon} alt="" aria-hidden />
            <span className="cat-chip__label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
