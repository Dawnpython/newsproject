import React from "react";
import { useNavigate } from "react-router-dom";
import "/src/components/stories/Stories.css";

import firstStory from "/src/assets/recomendation/image.png";
import secondStory from "/src/assets/recomendation/image-2.png";
import thirdStory from "/src/assets/recomendation/image-3.png";
import fourStory from "/src/assets/recomendation/image-4.png";
import fiveStory from "/src/assets/recomendation/image-5.png";
import sixStory from "/src/assets/recomendation/image-6.png";

/** label -> slug (как в БД) */
const LABEL_TO_SLUG = {
  "Если проездом": "passing-through",
  "За 1 день": "one-day",
  "За 3 дня": "three-days",
  "За 7 дней": "seven-days",
  "Летом": "summer",
  "Зимой": "winter",
};

const normalizeLabel = (label = "") => label.replace(/\s+/g, " ").trim();

/** По умолчанию сразу кладём корректные slug’и */
const DEFAULT_STORIES = [
  { title: "Если проездом", image: firstStory, slug: "passing-through" },
  { title: "За 1 день",     image: secondStory, slug: "one-day" },
  { title: "За 3 дня",      image: thirdStory,  slug: "three-days" },
  { title: "За 7 дней",     image: fourStory,   slug: "seven-days" },
  { title: "Летом",         image: fiveStory,   slug: "summer" },
  { title: "Зимой",         image: sixStory,    slug: "winter" },
];

export default function Stories({ items = DEFAULT_STORIES, onSelect }) {
  const navigate = useNavigate();

  const handleClick = (item) => {
    const normalized = normalizeLabel(item.title);
    const slug = item.slug || LABEL_TO_SLUG[normalized];
    if (!slug) return;

    if (onSelect) {
      onSelect(slug, item);
    } else {
      navigate(`/c/${slug}`, { state: { slug } });
    }
  };

  return (
    <div className="carousel">
      <div className="carousel-track">
        {items.map((card, index) => {
          const normalized = normalizeLabel(card.title);
          const slug = card.slug || LABEL_TO_SLUG[normalized];

          return (
            <button
              key={`${normalized}-${slug ?? index}`}
              type="button"
              className="carousel-item"
              style={{ backgroundImage: `url(${card.image})` }}
              onClick={() => handleClick(card)}
              aria-label={normalized}
              data-slug={slug}
            >
              <span className="carousel-label">{card.title}</span>
            </button>
          );
        })}
        <div className="carousel-spacer" aria-hidden="true"></div>
      </div>
    </div>
  );
}
