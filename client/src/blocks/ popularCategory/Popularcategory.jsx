import React, { useMemo, useState } from "react";
import "/src/blocks/ popularCategory/Popularcategory.css";

// ===== CategoryCardsMock.jsx =====
// Макет без изображений. Размеры по ТЗ: чипы 102x82, карточки 280x186.
// Замените тексты/заглушки и добавьте картинки позже.

const CATEGORIES = [
{ id: "water", label: "На воде" },
{ id: "premium", label: "Premium" },
{ id: "extreme", label: "Экстрим" },
{ id: "walk", label: "Пешком" },
{ id: "kids", label: "С детьми" },
{ id: "fun", label: "Развлечения" },
];

const CONTENT = {
water: [
{ title: "Прогулка на теплоходе", subtitle: "по Телецкому озеру" },
{ title: "Прогулка на катере", subtitle: "и рыбалка" },
],
premium: [
{ title: "VIP круиз", subtitle: "с дегустацией" },
{ title: "Частная яхта", subtitle: "на закате" },
],
extreme: [
{ title: "Рафтинг", subtitle: "река Катунь" },
{ title: "Джип-тур", subtitle: "по перевалам" },
],
walk: [
{ title: "Треккинг", subtitle: "горные озера" },
{ title: "Пешая экскурсия", subtitle: "по селу" },
],
kids: [
{ title: "Семейная велопрогулка" },
{ title: "Верёвочный парк" },
],
fun: [
{ title: "Квадро-сафари" },
{ title: "Баня на дровах", subtitle: "и чан" },
],
};

export default function Popularcategory() {
const [active, setActive] = useState(CATEGORIES[0].id);
const items = useMemo(() => CONTENT[active] ?? [], [active]);

return (
<div className="wrap">
<header className="head">
<span className="star">★</span>
<h2>Самое популярное</h2>
</header>

<div className="slider" role="tablist" aria-label="Категории">
{CATEGORIES.map((c) => (
<button
key={c.id}
role="tab"
aria-selected={active === c.id}
className={"chip" + (active === c.id ? " chip--active" : "")}
onClick={() => setActive(c.id)}
>
<span className="chip__icon" aria-hidden />
<span className="chip__label">{c.label}</span>
</button>
))}
</div>

<div className="cards">
{items.slice(0, 2).map((it, idx) => (
<article key={idx} className="card">
<div className="card__bg" />
<div className="card__overlay">
<h3 className="card__title">{it.title}</h3>
{it.subtitle && <p className="card__subtitle">{it.subtitle}</p>}
</div>
<button className="card__cta" aria-label="Открыть">→</button>
</article>
))}
</div>
</div>
);
}