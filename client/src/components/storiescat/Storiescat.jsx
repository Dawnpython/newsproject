import "/src/components/storiescat/Storiescat.css";

import firstIcon from "/src/assets/icons/storiescat/storycat-1.png";
import secondIcon from "/src/assets/icons/storiescat/storycat-2.png";
import thirdIcon from "/src/assets/icons/storiescat/storycat-3.png";
import fourIcon from "/src/assets/icons/storiescat/storycat-4.png";
import fiveIcon from "/src/assets/icons/storiescat/storycat-5.png";

const DEFAULT_ITEMS = [
  { label: "Любимые места  \nтуристов", bg: "#00D6FF", icon: firstIcon },
  { label: "Без гидов \nи программ", bg: "linear-gradient(135deg,#0072FF,#7810D3)", icon: secondIcon, color: "white" },
  { label: "Дорогие\nудовольствия", bg: "#000000", icon: thirdIcon },
  { label: "Где поесть", bg: "linear-gradient(135deg,#FF9F00,#FF6200)", icon: fourIcon, color: "white" },
  { label: "Маркетплейс", bg: "#00E989", icon: fiveIcon },
];

export default function Storiescat({ items = DEFAULT_ITEMS, onSelect }) {
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

  return (
    <div className="storiescat-scroll">
      <div className="storiescat-track">
        {items.map((it, i) => (
          <button
            key={`${it.label}-${i}`}
            type="button"
            className="storiescat-tile"
            style={makeStyle(it)}
            onClick={() => onSelect?.(it.label)}
          >
            {it.icon && <img src={it.icon} alt="" className="storiescat-icon" />}
            <span className="storiescat-label">{it.label}</span>
          </button>
        ))}
        {/* отступ справа, чтобы не прилипало */}
        <div className="storiescat-spacer" />
      </div>
    </div>
  );
}
