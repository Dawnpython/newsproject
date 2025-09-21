
import { useRef } from "react";

import '/src/components/slimcategory/slimCategory.css'

const DEFAULT_CATEGORIES = [
  "Новости",
  "Медицина",
  "Спорт",
  "Технологии",
  "Игры",
  "Путешествия",
  "Еда",
  "Музыка",
  "Фильмы",
  "Бизнес",
];

export default function SlimCategory({ items = DEFAULT_CATEGORIES, onSelect }) {
  const trackRef = useRef(null);

  return (
    <div className="cat-carousel">

      <div className="cat-track" ref={trackRef}>
        {items.map((label) => (
          <button
            key={label}
            type="button"
            className="cat-chip"
            onClick={() => onSelect?.(label)}
          >
            {label}
          </button>
        ))}
      </div>

    </div>
  );
}
