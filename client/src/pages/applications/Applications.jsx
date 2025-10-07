import "/src/pages/applications/Applications.css";
import Navbar from "/src/components/navbar/Navbar.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch, FiX, FiCheck } from "react-icons/fi";
import {
  FaSailboat,
  FaTaxi,
  FaUserTie,
  FaHotel,
  FaKey,
  FaUsers,
} from "react-icons/fa6";

import People from "/src/assets/People.png";
import emptyBox from "/src/assets/icons/application/empty.png";

/** список категорий с иконками */
const CATEGORY_OPTIONS = [
  { id: "boats", label: "Лодки и экскурсии на воде", Icon: FaSailboat },
  { id: "taxi", label: "Заказать такси", Icon: FaTaxi },
  { id: "guides", label: "Частные гиды", Icon: FaUserTie },
  { id: "hotels", label: "Отели и турбазы", Icon: FaHotel },
  { id: "rent", label: "Аренда жилья", Icon: FaKey },
  { id: "locals", label: "Местные жители", Icon: FaUsers },
];

function useClickOutside(ref, handler) {
  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("touchstart", onClick);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick);
    };
  }, [ref, handler]);
}

function MultiSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  useClickOutside(boxRef, () => setOpen(false));

  const selected = useMemo(
    () => CATEGORY_OPTIONS.filter((c) => value.includes(c.id)),
    [value]
  );

  const toggle = (id) => {
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id]
    );
  };

  const clear = () => onChange([]);

  return (
    <div className="ms" ref={boxRef}>
      {/* Триггер */}
      <button
        type="button"
        className={`ms-trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <FiSearch className="ms-search" aria-hidden />
        <div className="ms-chips">
          {selected.length === 0 ? (
            <span className="ms-placeholder">Выберите категории</span>
          ) : (
            selected.map((c, i) => (
              <span key={c.id} className={`ms-chip ${i % 2 ? "alt" : ""}`}>
                <c.Icon className="ms-chip-ico" />
                {c.label}
              </span>
            ))
          )}
        </div>
        {selected.length > 0 ? (
          <span
            className="ms-clear"
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            role="button"
            aria-label="Очистить"
          >
            <FiX />
          </span>
        ) : (
          <span className="ms-clear-placeholder" />
        )}
      </button>

      {/* Дропдаун */}
      {open && (
        <div className="ms-card" role="listbox" tabIndex={-1}>
          <ul className="ms-list">
            {CATEGORY_OPTIONS.map(({ id, label, Icon }) => {
              const checked = value.includes(id);
              return (
                <li
                  key={id}
                  className="ms-row"
                  onClick={() => toggle(id)}
                  role="option"
                  aria-selected={checked}
                >
                  <span className="ms-left">
                    <Icon
                      className={`ms-row-ico ${checked ? "is-active" : ""}`}
                    />
                    <span
                      className={`ms-row-title ${checked ? "is-active" : ""}`}
                    >
                      {label}
                    </span>
                  </span>
                  <span className={`ms-check ${checked ? "is-on" : ""}`}>
                    <FiCheck />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Application() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/account", { replace: true });
  }, [navigate]);

  const [categories, setCategories] = useState([]);
  const [text, setText] = useState("");
  const MAX = 150;

  const submit = (e) => {
    e.preventDefault();
    const payload = { categories, text: text.trim() };
    console.log("FORM:", payload);
    // здесь можно сделать fetch/axios
  };

  return (
    <div className="application">
      <div className="application-top">
        <form className="app-card" onSubmit={submit}>
          <h1 className="app-title">
            МЕСТНЫЕ
            <br />
            ПОМОГУТ
          </h1>

          <MultiSelect value={categories} onChange={setCategories} />

          <label className="app-label">
            Опишите свой запрос в свободной форме
          </label>
          <div className="app-textarea-wrap">
            <textarea
              className="app-textarea"
              placeholder="Например, «Приехали на 3 дня, семьей 5 человек, предложите пожалуйста дом с тремя комнатами, поближе к воде»"
              maxLength={MAX}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
            />
            <span className="app-counter">
              {text.length}/{MAX}
            </span>
          </div>

          <button className="app-submit" type="submit">
            Отправить
          </button>

          <div className="app-footer">
            <div className="app-avatars">
              <img src={People} />
            </div>
            <p className="app-note">
              В нашем сервисе — более 300 местных жителей и предпринимателей,
              готовых прямо сейчас откликнуться на ваш запрос
            </p>
          </div>
        </form>
      </div>

      <div className="application-bottom">
        <div className="empty-apps">
          <img width={100} height={100} src={emptyBox}></img>
          <h1>Вы еще не сделали<br/>
ни одного запроса</h1>
<p>Оставьте заявку и получайте<br/>
предложения  — местные помогут!</p>
        </div>
      </div>
      <Navbar />
    </div>
  );
}
