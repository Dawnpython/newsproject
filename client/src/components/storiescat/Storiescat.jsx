import { useNavigate } from "react-router-dom";
import "/src/components/storiescat/Storiescat.css";

import firstIcon from "/src/assets/icons/storiescat/storycat-1.png";
import secondIcon from "/src/assets/icons/storiescat/storycat-2.png";
import thirdIcon from "/src/assets/icons/storiescat/storycat-3.png";
import fourIcon from "/src/assets/icons/storiescat/storycat-4.png";
import fiveIcon from "/src/assets/icons/storiescat/storycat-5.png";


const LABEL_TO_SLUG = {
  "Любимые места туристов": "tourist-favorites",
  "Без гидов и программ": "no-guides",
  "Дорогие удовольствия": "luxury",
  "Где поесть": "food",
};


const LABEL_TO_HREF = {
  "Маркетплейс": "/marketplace", 
};


const normalizeLabel = (s = "") => s.replace(/\s+/g, " ").trim();


const DEFAULT_ITEMS = [
  { label: "Любимые места  \nтуристов", bg: "#00D6FF", icon: firstIcon, slug: "tourist-favorites" },
  { label: "Без гидов \nи программ", bg: "linear-gradient(135deg,#0072FF,#7810D3)", icon: secondIcon, color: "white", slug: "no-guides" },
  { label: "Дорогие\nудовольствия", bg: "#000000", icon: thirdIcon, slug: "luxury" },
  { label: "Где поесть", bg: "linear-gradient(135deg,#FF9F00,#FF6200)", icon: fourIcon, color: "white", slug: "food" },
  { label: "Маркетплейс", bg: "#00E989", icon: fiveIcon, href: "/marketplace" },
];

export default function Storiescat({ items = DEFAULT_ITEMS, onSelect }) {
  const navigate = useNavigate();

  const makeStyle = ({ bg, color }) => {
    const isGradient = typeof bg === "string" && bg.startsWith("linear-gradient");
    return {
      ...(isGradient ? { backgroundImage: bg } : { backgroundColor: bg }),
      backgroundSize: isGradient ? "auto" : undefined,
      backgroundPosition: isGradient ? "0 0" : undefined,
      backgroundRepeat: isGradient ? "repeat" : undefined,
      color: color ?? "#fff",
    };
  };

  const handleClick = (it) => {
    const normalized = normalizeLabel(it.label);
    const slug = it.slug || LABEL_TO_SLUG[normalized];
    const href = it.href || LABEL_TO_HREF[normalized];

    if (onSelect) {
      onSelect(slug ?? href, it); 
      return;
    }

    if (slug) {
      navigate(`/c/${slug}`, { state: { slug } });
    } else if (href) {
      navigate(href);
    }
  };

  return (
    <div className="storiescat-scroll">
      <div className="storiescat-track">
        {items.map((it, i) => {
          const style = makeStyle(it);
          const normalized = normalizeLabel(it.label);
          const slug = it.slug || LABEL_TO_SLUG[normalized];
          const href = it.href || LABEL_TO_HREF[normalized];

          return (
            <button
              key={`${normalized}-${slug ?? href ?? i}`}
              type="button"
              className="storiescat-tile"
              style={style}
              onClick={() => handleClick(it)}
              aria-label={normalized}
              data-slug={slug}
              data-href={href}
            >
              {it.icon && <img src={it.icon} alt="" className="storiescat-icon" />}
              <span className="storiescat-label">
                {String(it.label).split("\n").map((line, idx, arr) => (
                  <span key={idx}>
                    {line}
                    {idx < arr.length - 1 ? <br /> : null}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
       
        <div className="storiescat-spacer" />
      </div>
    </div>
  );
}
