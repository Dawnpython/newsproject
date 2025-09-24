import "src/components/fatcategory/Fatcategory.css";

const DEFAULT_TILES = [
  { label: "Лодки и паромы", bg: "linear-gradient(135deg,#21d4fd,#b721ff)" },
  { label: "Такси", bg: "linear-gradient(135deg,#ffd86f,#fc6262)" },
  { label: "Отели и турбазы", bg: "linear-gradient(135deg,#7fefbd,#21cdc3)" },
  { label: "Где поесть", bg: "linear-gradient(135deg,#ffe29f,#ffa99f)" },
  { label: "Маркетплейс", bg: "linear-gradient(135deg,#a18cd1,#fbc2eb)" },
  { label: "Гиды", bg: "linear-gradient(135deg,#f6d365,#fda085)" },
  { label: "Экскурсии", bg: "linear-gradient(135deg,#74ebd5,#9face6)" },
  { label: "Аренда жилья", bg: "linear-gradient(135deg,#fbd786,#f7797d)" },
  { label: "Магазины и рынки", bg: "linear-gradient(135deg,#fdfbfb,#ebedee)", color:"#222" },
  { label: "Скидки и акции города", bg: "linear-gradient(135deg,#ff8177,#cf556c)" },
];

export default function Fatcategory({ items = DEFAULT_TILES, onSelect }) {
  return (
    <div className="tiles-scroll">
      <div className="tiles-track">
        {items.map(({ label, bg, color }, i) => (
          <button
            key={`${label}-${i}`}
            type="button"
            className="tile"
            style={{ background: bg, color: color ?? "#fff" }}
            onClick={() => onSelect?.(label)}
            aria-label={label}
          >
            <span className="tile__label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
