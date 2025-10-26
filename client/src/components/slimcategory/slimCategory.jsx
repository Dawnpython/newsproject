import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import "/src/components/slimcategory/slimCategory.css";

import iconNews from '/src/assets/icons/slimcategory/icon-doc.png'
import iconCloud from '/src/assets/icons/slimcategory/icon-cloud.png'
import iconSale from '/src/assets/icons/slimcategory/icon-sale.png'
import iconCar from '/src/assets/icons/slimcategory/icon-car.png'
import iconBank from '/src/assets/icons/slimcategory/icon-money.png'
import iconFarm from '/src/assets/icons/slimcategory/icon-pharm.png'
import iconChuch from '/src/assets/icons/slimcategory/icon-church.png'


const LABEL_TO_SLUG = {
  "Новости": "news",                
  "Погода": "weather",
  "Скидки города": "city-deals",
  "Авторемонт": "auto-repair",
  "Банкоматы": "atms",
  "Аптеки": "pharmacies",
  "Церкви и храмы": "churches",
};


const DEFAULT_CATEGORIES = [
  { label: "Новости",        icon: iconNews,  slug: LABEL_TO_SLUG["Новости"] },
  { label: "Погода",         icon: iconCloud, slug: LABEL_TO_SLUG["Погода"] },
  { label: "Скидки города",  icon: iconSale,  slug: LABEL_TO_SLUG["Скидки города"] },
  { label: "Авторемонт",     icon: iconCar,   slug: LABEL_TO_SLUG["Авторемонт"] },
  { label: "Банкоматы",      icon: iconBank,  slug: LABEL_TO_SLUG["Банкоматы"] },
  { label: "Аптеки",         icon: iconFarm,  slug: LABEL_TO_SLUG["Аптеки"] },
  { label: "Церкви и храмы", icon: iconChuch, slug: LABEL_TO_SLUG["Церкви и храмы"] },
];

export default function SlimCategory({ items = DEFAULT_CATEGORIES, onSelect }) {
  const trackRef = useRef(null);
  const navigate = useNavigate();

  const handleClick = (item) => {
    const slug = item.slug || LABEL_TO_SLUG[item.label];
    if (!slug) return;

    if (onSelect) {
      onSelect(slug, item);
    } else {
     
      navigate(`/c/${slug}`, { state: { slug } });
    }
  };

  return (
    <div className="cat-carousel">
      <div className="cat-track" ref={trackRef}>
        {items.map((item) => {
          const slug = item.slug || LABEL_TO_SLUG[item.label];
          return (
            <button
              key={`${item.label}-${slug}`}
              type="button"
              className="cat-chip"
              onClick={() => handleClick(item)}
              aria-label={item.label}
              data-slug={slug}
            >
              <img className="cat-chip__icon" style={{width:12}} src={item.icon} alt="" aria-hidden />
              <span className="cat-chip__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
