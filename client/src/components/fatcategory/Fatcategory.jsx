import "/src/components/fatcategory/Fatcategory.css";

import otelImg from "/src/assets/img-category-bg-3.png";
import firstIcon from '/src/assets/icons/ fatcategory/img-category-1.svg'
import secondIcon from '/src/assets/icons/ fatcategory/img-category-2.svg'
import thirdIcon from '/src/assets/icons/ fatcategory/img-category-3.svg'
import fourIcon from '/src/assets/icons/ fatcategory/img-category-4.svg'
import fiveIcon from '/src/assets/icons/ fatcategory/img-category-5.svg'
import sixIcon from '/src/assets/icons/ fatcategory/img-category-6.svg'
import sevenIcon from '/src/assets/icons/ fatcategory/img-category-7.svg'
import eightIcon from '/src/assets/icons/ fatcategory/img-category-8.svg'
import nineIcon from '/src/assets/icons/ fatcategory/img-category-9.svg'
import tenIcon from '/src/assets/icons/ fatcategory/img-category-10.svg'

const DEFAULT_TILES = [
  { label: "Лодки \nи паромы", bg: "linear-gradient(135deg,#0FB6FF,#00D586,#BEEF22)", icon: firstIcon },
  { label: "Такси", bg: "#F3F4F6", icon: secondIcon,color:'black'},
  { label: "Отели \nи турбазы", bg: "#1DDA94", bgImage: otelImg, icon:thirdIcon },
  { label: "Где поесть", bg: "#FFDC4C", icon:fourIcon,color:'black' },
  { label: "Маркетплейс", bg: "#7952EB", icon:fiveIcon },
  { label: "Гиды", color: "black", bg: "#F3F4F6",  icon:sixIcon },
  { label: "Экскурсии", bg: "#27D9FE", icon:sevenIcon },
  { label: "Аренда \nжилья", bg: "linear-gradient(135deg,#FFC300,#FF8E00)", icon:eightIcon },
  { label: "Магазины \nи рынки", bg: "#F3F4F6", color: "#222", icon:nineIcon },
  { label: "Скидки и акции \nгорода", bg: "#FF0043",icon:tenIcon },
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
