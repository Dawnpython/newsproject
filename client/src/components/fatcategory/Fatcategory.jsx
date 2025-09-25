import "/src/components/fatcategory/Fatcategory.css";

import otelImg from "/src/assets/img-category-bg-3.png";
import gidImg from "/src/assets/img-category-bg-6.png";
import firstIcon from '/src/assets/icons/ fatcategory/img-category-1.svg'

const DEFAULT_TILES = [
  { label: "Лодки и паромы", bg: "linear-gradient(135deg,#0FB6FF,#00D586,#BEEF22)", icon: firstIcon },
  { label: "Такси", bg: "#F3F4F6"},
  { label: "Отели и турбазы", bg: "#1DDA94", bgImage: otelImg },
  { label: "Где поесть", bg: "#FFDC4C" },
  { label: "Маркетплейс", bg: "#7952EB" },
  { label: "Гиды", color: "black", bg: "#d2d3d5ff", bgImage: gidImg },
  { label: "Экскурсии", bg: "#27D9FE" },
  { label: "Аренда жилья", bg: "linear-gradient(135deg,#FFC300,#FF8E00)" },
  { label: "Магазины и рынки", bg: "#F3F4F6", color: "#222" },
  { label: "Скидки и акции города", bg: "#FF0043" },
];

export default function Fatcategory({ items = DEFAULT_TILES, onSelect }) {
  const firstRow = items.slice(0, 5);
  const secondRow = items.slice(5);

  const makeStyle = ({ bg, bgImage, color }) => {
    const isGradient = typeof bg === "string" && bg.startsWith("linear-gradient");

    if (bgImage) {
      return {
        backgroundColor: !isGradient ? bg : undefined,
        backgroundImage: isGradient ? `${bg}, url(${bgImage})` : `url(${bgImage})`,
        backgroundSize: isGradient ? "auto, cover" : "cover",
        backgroundPosition: isGradient ? "0 0, center" : "center",
        backgroundRepeat: isGradient ? "repeat, no-repeat" : "no-repeat",
        color: color ?? "#fff",
      };
    }

    return {
      ...(isGradient ? { backgroundImage: bg } : { backgroundColor: bg }),
      backgroundSize: isGradient ? "auto" : undefined,
      backgroundPosition: isGradient ? "0 0" : undefined,
      backgroundRepeat: isGradient ? "repeat" : undefined,
      color: color ?? "#fff",
    };
  };

  const renderTile = (it, i, extraClass = "") => (
    <button
      key={`${it.label}-${i}`}
      type="button"
      className={`tile ${it.label === "Такси" ? "tile--small" : ""} ${extraClass}`}
      style={makeStyle(it)}
      onClick={() => onSelect?.(it.label)}
    >
      {it.icon && <img src={it.icon} alt="" className="tile__icon" />} {/* 👈 иконка */}
      <span className="tile__label">{it.label}</span>
    </button>
  );

  return (
    <div className="tiles-scroll">
      <div className="tiles-wrapper">
        <div className="tiles-row">{firstRow.map(renderTile)}</div>
        <div className="tiles-row">{secondRow.map(renderTile)}</div>
      </div>
    </div>
  );
}
