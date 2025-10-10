import "/src/components/fatcategory/Fatcategory.css";

import otelImg from "/src/assets/img-category-bg-3.png";
// 👇 поправил пути: убрал пробел между "icons/" и "fatcategory"
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

/**
 * Для плиток с картинкой можно (необязательно) добавить bgImage2x/bgImage3x
 * чтобы ретина брала более чёткие источники.
 */
const DEFAULT_TILES = [
  { label: "Лодки \nи паромы", color: "white", bg: "linear-gradient(135deg,#0FB6FF,#00D586,#BEEF22)", icon: firstIcon },
  { label: "Такси", bg: "#F3F4F6", icon: secondIcon, color: "black" },
  { label: "Отели \nи турбазы", bg: "#1DDA94", bgImage: otelImg, icon: thirdIcon },
  { label: "Где поесть", bg: "#FFDC4C", icon: fourIcon, color: "black" },
  { label: "Маркетплейс", bg: "#7952EB", icon: fiveIcon },
  { label: "Гиды", bg: "#F3F4F6", color: "black", icon: sixIcon },
  { label: "Экскурсии", bg: "#27D9FE", icon: sevenIcon },
  { label: "Аренда \nжилья", bg: "linear-gradient(135deg,#FFC300,#FF8E00)", icon: eightIcon },
  { label: "Магазины \nи рынки", bg: "#F3F4F6", color: "#222", icon: nineIcon },
  { label: "Скидки и акции \nгорода", bg: "#FF0043", icon: tenIcon },
];

export default function Fatcategory({ items = DEFAULT_TILES, onSelect }) {
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

  const Tile = (it, i) => {
    const isSmall = it.label === "Такси";
    const style = makeBaseStyle(it);

    return (
      <button
        key={`${it.label}-${i}`}
        type="button"
        className={`tile ${isSmall ? "tile--small" : ""} ${it.bgImage ? "tile--has-img" : ""}`}
        style={style}
        onClick={() => onSelect?.(it.label)}
      >
        {/* Фоновая картинка как <img> для чёткости + srcSet (если передадите) */}
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

        {/* Если нужно совместить ГРАДИЕНТ + картинку: добавляем полупрозрачный слой */}
        {it.bgImage && style.backgroundImage && (
          <span className="tile__gradient" aria-hidden="true" />
        )}

        {/* Иконка */}
        {it.icon && <img src={it.icon} alt="" className="tile__icon" />}

        {/* Текст */}
        <span className="tile__label">{it.label}</span>
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
