import "/src/components/fatcategory/Fatcategory.css";

const DEFAULT_TILES = [
  { label: "Лодки и паромы", bg: "linear-gradient(135deg,#0FB6FF,#00D586,#BEEF22)" },
  { label: "Такси", bg: "#F3F4F6" }, 
  { label: "Отели и турбазы", bg: "#1DDA94" },
  { label: "Где поесть", bg: "#FFDC4C" },
  { label: "Маркетплейс", bg: "#7952EB" },
  { label: "Гиды", bg: "#F3F4F6" },
  { label: "Экскурсии", bg: "#27D9FE" },
  { label: "Аренда жилья", bg: "linear-gradient(135deg,#FFC300,#FF8E00)" },
  { label: "Магазины и рынки", bg: "#F3F4F6", color: "#222" },
  { label: "Скидки и акции города", bg: "#FF0043" },
];

export default function Fatcategory({ items = DEFAULT_TILES, onSelect }) {
  const firstRow = items.slice(0, 5);
  const secondRow = items.slice(5);

  return (
    <div className="tiles-scroll">
      <div className="tiles-wrapper">
        <div className="tiles-row">
          {firstRow.map(({ label, bg, color }, i) => (
            <button
              key={`row1-${i}`}
              type="button"
              className={`tile ${label === "Такси" ? "tile--small" : ""}`} // 👈 условный класс
              style={{ background: bg, color: color ?? "#fff" }}
              onClick={() => onSelect?.(label)}
            >
              <span className="tile__label">{label}</span>
            </button>
          ))}
        </div>

        <div className="tiles-row">
          {secondRow.map(({ label, bg, color }, i) => (
            <button
              key={`row2-${i}`}
              type="button"
              className="tile"
              style={{ background: bg, color: color ?? "#fff" }}
              onClick={() => onSelect?.(label)}
            >
              <span className="tile__label">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
