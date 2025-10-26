import { useNavigate } from "react-router-dom";
import "/src/components/fatcategory/Fatcategory.css";

import otelImg from "/src/assets/img-category-bg-3.png";
import firstIcon from "/src/assets/icons/fatcategory/img-category-1.png";
import secondIcon from "/src/assets/icons/fatcategory/img-category-2.png";
import thirdIcon from "/src/assets/icons/fatcategory/img-category-3.png";
import fourIcon from "/src/assets/icons/fatcategory/img-category-4.png";
import fiveIcon from "/src/assets/icons/fatcategory/img-category-5.png";
import sixIcon from "/src/assets/icons/fatcategory/img-category-6.png";
import sevenIcon from "/src/assets/icons/fatcategory/img-category-7.png";
import eightIcon from "/src/assets/icons/fatcategory/img-category-8.png";
import nineIcon from "/src/assets/icons/fatcategory/img-category-9.png";
import tenIcon from "/src/assets/icons/fatcategory/img-category-10.png";


const LABEL_TO_SLUG = {
  "Лодки и паромы": "boats",
  "Такси": "taxi",
  "Отели и турбазы": "hotels",
  "Где поесть": "food",
  "Маркетплейс": "marketplace",
  "Гиды": "guides",
  "Экскурсии": "tours",
  "Аренда жилья": "rent",
  "Магазины и рынки": "shops",
  "Скидки и акции города": "city-deals",
};


const normalizeLabel = (label = "") => label.replace(/\s+/g, " ").trim();


const DEFAULT_TILES = [
  {
    label: "Лодки \nи паромы",
    slug: "boats",
    color: "white",
    bg: "linear-gradient(135deg,#0FB6FF,#00D586,#BEEF22)",
    icon: firstIcon,
  },
  { label: "Такси", slug: "taxi", bg: "#F3F4F6", icon: secondIcon, color: "black" },
  {
    label: "Отели \nи турбазы",
    slug: "hotels",
    bg: "#1DDA94",
    bgImage: otelImg,
    icon: thirdIcon,
  },
  { label: "Где поесть", slug: "food", bg: "#FFDC4C", icon: fourIcon, color: "black" },
  { label: "Маркетплейс", slug: "marketplace", bg: "#7952EB", icon: fiveIcon },
  { label: "Гиды", slug: "guides", bg: "#F3F4F6", color: "black", icon: sixIcon },
  { label: "Экскурсии", slug: "tours", bg: "#27D9FE", icon: sevenIcon },
  {
    label: "Аренда \nжилья",
    slug: "rent",
    bg: "linear-gradient(135deg,#FFC300,#FF8E00)",
    icon: eightIcon,
  },
  { label: "Магазины \nи рынки", slug: "shops", bg: "#F3F4F6", color: "#222", icon: nineIcon },
  { label: "Скидки и акции \nгорода", slug: "city-deals", bg: "#FF0043", icon: tenIcon },
];

export default function Fatcategory({ items = DEFAULT_TILES, onSelect }) {
  const navigate = useNavigate();

  const firstRow = items.slice(0, 5);
  const secondRow = items.slice(5);

  const makeBaseStyle = ({ bg, color }) => {
    const isGradient = typeof bg === "string" && bg.startsWith("linear-gradient");
    return {
      ...(isGradient ? { backgroundImage: bg } : { backgroundColor: bg }),
      backgroundSize: isGradient ? "auto" : undefined,
      backgroundPosition: isGradient ? "0 0" : undefined,
      backgroundRepeat: isGradient ? "repeat" : undefined,
      color: color ?? "#fff",
    };
  };

  const handleClick = (item) => {
    const normalized = normalizeLabel(item.label);
    const slug = item.slug || LABEL_TO_SLUG[normalized];
    if (!slug) return;

    if (onSelect) {
      onSelect(slug, item);
    } else {
      navigate(`/c/${slug}`, { state: { slug } });
    }
  };

  const Tile = (it, i) => {
    const isSmall = normalizeLabel(it.label) === "Такси";
    const style = makeBaseStyle(it);
    const normalized = normalizeLabel(it.label);
    const slug = it.slug || LABEL_TO_SLUG[normalized];

    return (
      <button
        key={`${normalized}-${slug ?? i}`}
        type="button"
        className={`tile ${isSmall ? "tile--small" : ""} ${it.bgImage ? "tile--has-img" : ""}`}
        style={style}
        onClick={() => handleClick(it)}
        aria-label={normalized}
        data-slug={slug}
      >
        
        {it.bgImage && (
          <img
            className="tile__bg"
            src={it.bgImage}
            srcSet={
              it.bgImage2x && it.bgImage3x
                ? `${it.bgImage2x} 2x, ${it.bgImage3x} 3x`
                : it.bgImage2x
                ? `${it.bgImage2x} 2x`
                : undefined
            }
            alt=""
            loading="lazy"
          />
        )}

        
        {it.bgImage && style.backgroundImage && <span className="tile__gradient" aria-hidden="true" />}

       
        {it.icon && <img src={it.icon} alt="" className="tile__icon" />}

       
        <span className="tile__label">
          {String(it.label).split("\n").map((line, idx) => (
            <span key={idx}>
              {line}
              {idx < String(it.label).split("\n").length - 1 ? <br /> : null}
            </span>
          ))}
        </span>
      </button>
    );
  };

  return (
    <div className="tiles-scroll">
      <div className="tiles-wrapper">
        <div className="tiles-row">{firstRow.map(Tile)}</div>
        <div className="tiles-row">{secondRow.map(Tile)}</div>
      </div>
    </div>
  );
}
