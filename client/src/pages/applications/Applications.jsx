import "/src/pages/applications/Applications.css";
import Navbar from "/src/components/navbar/Navbar.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch, FiX, FiCheck } from "react-icons/fi";

import boatsImg from "/src/assets/icons/application/boat.png";
import guidesImg from "/src/assets/icons/application/guides.png";
import hotelsImg from "/src/assets/icons/application/hotels.png";
import rentImg from "/src/assets/icons/application/rent.png";
import taxiImg from "/src/assets/icons/application/taxi.png";
import localsImg from "/src/assets/icons/application/peoples.png";

import People from "/src/assets/People.png";
import emptyBox from "/src/assets/icons/application/empty.png";
import convert from "/src/assets/convert.png";

/** адрес API */
const API_BASE = "https://newsproject-dx8n.onrender.com";

/** список категорий с картинками */
const CATEGORY_OPTIONS = [
  { id: "boats", label: "Лодки и экскурсии на воде", img: boatsImg },
  { id: "taxi", label: "Заказать такси", img: taxiImg },
  { id: "guides", label: "Частные гиды", img: guidesImg },
  { id: "hotels", label: "Отели и турбазы", img: hotelsImg },
  { id: "rent", label: "Аренда жилья", img: rentImg },
  { id: "locals", label: "Местные жители", img: localsImg },
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
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };
  const clear = () => onChange([]);

  return (
    <>
      {open && <div className="ms-overlay" onClick={() => setOpen(false)} aria-hidden />}
      <div className="ms" ref={boxRef}>
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
                  <img src={c.img} alt="" className="ms-chip-ico" />
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

        {open && (
          <div className="ms-card" role="listbox" tabIndex={-1}>
            <ul className="ms-list">
              {CATEGORY_OPTIONS.map(({ id, label, img }) => {
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
                      <img
                        src={img}
                        alt=""
                        className={`ms-row-ico ${checked ? "is-active" : ""}`}
                      />
                      <span className={`ms-row-title ${checked ? "is-active" : ""}`}>
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
    </>
  );
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** безопасно берём первое числовое значение */
function firstNumber(...vals) {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return 0;
}

// Карточка заявки: сама дотягивает количество откликов
function RequestCard({ req, onAskCancel }) {
  const navigate = useNavigate();
  const goResponses = () => navigate(`/applications/${req.id}/responses`);

  const firstCat = req.categories?.[0];
  const catMeta = CATEGORY_OPTIONS.find((c) => c.id === firstCat);
  const iconSrc = catMeta?.img || localsImg;

  // стартовое значение из любых доступных полей
  const initialCount = firstNumber(
    req.messages_cnt,
    req.responses_cnt,
    req.responses_count,
    Array.isArray(req.responses) ? req.responses.length : undefined
  );
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const r = await fetch(`${API_BASE}/api/requests/${req.id}/responses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const data = await r.json();
        const arr = Array.isArray(data?.responses) ? data.responses : [];
        if (!abort) setCount(arr.length);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      abort = true;
    };
  }, [req.id]);

  return (
    <div
      className="rq-card rq-card-click"
      onClick={goResponses}
      role="button"
      tabIndex={0}
      aria-label={`Открыть отклики по заявке #${String(req.short_code).padStart(5, "0")}`}
    >
      {/* ✉️ Иконка + число откликов рядом */}
      <div className="rq-mail" aria-label={`Откликов: ${count}`}>
        <span className="rq-mail-icon" aria-hidden>
          <img src={convert} alt="" />
        </span>
        <span className="rq-mail-num">{count}</span>
      </div>

      <div className="rq-head">
        <div className="rq-num">#{String(req.short_code).padStart(5, "0")}</div>
        <div className="rq-date">{formatDate(req.created_at)}</div>
      </div>

      <div className={`rq-badge cat-${firstCat || "default"}`}>
        <img src={iconSrc} alt="" className="rq-badge-ico" />
        <span>{catMeta?.label || "Запрос"}</span>
      </div>

      <div className="rq-text">{req.text}</div>

      <button
        className="rq-cancel"
        onClick={(e) => {
          e.stopPropagation();
          onAskCancel(req, count); // передаём реальный count в bottom-sheet
        }}
      >
        Отменить
      </button>
    </div>
  );
}

/* ---------- Bottom Sheet ---------- */
function CancelSheet({ open, request, count, onClose, onConfirm }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <div
        className={`sheet-backdrop ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`sheet ${open ? "is-open" : ""}`} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <h3 className="sheet-title">
          Вы точно хотите
          <br />
          отменить заявку?
        </h3>
        <p className="sheet-sub">
          На вашу заявку уже откликнулось <b>{count}</b> человек.
          <br />
          Возможно там есть то, что вас заинтересует!
        </p>

        <div className="sheet-actions">
          <button className="btn btn-outline" onClick={onConfirm}>
            Да, отменить
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Нет, оставить
          </button>
        </div>
      </aside>
    </>
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
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // состояние для bottom-sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetReq, setSheetReq] = useState(null);
  const [sheetCount, setSheetCount] = useState(0);

  const MAX = 150;

  // грузим мои заявки
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_BASE}/api/requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await r.json();
        setRequests(Array.isArray(data?.requests) ? data.requests : []);
      } catch (e) {
        console.error(e);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return navigate("/account", { replace: true });

    const payload = { categories, text: text.trim() };
    if (payload.categories.length === 0 || payload.text === "") return;

    try {
      setSubmitting(true);
      const r = await fetch(`${API_BASE}/api/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error("create_failed");
      const { request } = await r.json();
      setRequests((prev) => [request, ...prev]); // у новой 0 откликов до первого дотяга
      setCategories([]);
      setText("");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = categories.length === 0 || text.trim() === "";

  const askCancel = (req, count) => {
    setSheetReq(req);
    setSheetCount(count ?? 0);
    setSheetOpen(true);
  };

  const confirmCancel = async () => {
    if (!sheetReq) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const r = await fetch(`${API_BASE}/api/requests/${sheetReq.id}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("cancel_failed");
      setRequests((prev) => prev.filter((x) => x.id !== sheetReq.id));
    } catch (e) {
      console.error(e);
    } finally {
      setSheetOpen(false);
      setSheetReq(null);
      setSheetCount(0);
    }
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

          <label className="app-label">Опишите свой запрос в свободной форме</label>
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

          <button
            className={`app-submit ${disabled ? "disabled" : ""}`}
            type="submit"
            disabled={disabled || submitting}
          >
            {submitting ? "Отправляем…" : "Отправить"}
          </button>

          <div className="app-footer">
            <div className="app-avatars">
              <img src={People} alt="" />
            </div>
            <p className="app-note">
              В нашем сервисе — более 300 местных жителей и предпринимателей, готовых прямо
              сейчас откликнуться на ваш запрос
            </p>
          </div>
        </form>
      </div>

      <div className="application-bottom">
        {loading ? (
          <div className="empty-apps">Загрузка…</div>
        ) : requests.length === 0 ? (
          <div className="empty-apps">
            <img width={100} height={100} src={emptyBox} alt="" />
            <h1>
              Вы еще не сделали
              <br />
              ни одного запроса
            </h1>
            <p>
              Оставьте заявку и получайте
              <br />
              предложения — местные помогут!
            </p>
          </div>
        ) : (
          <div className="rq-list">
            {requests.map((r) => (
              <RequestCard key={r.id} req={r} onAskCancel={askCancel} />
            ))}
          </div>
        )}
      </div>

      <CancelSheet
        open={sheetOpen}
        request={sheetReq}
        count={sheetCount}
        onClose={() => {
          setSheetOpen(false);
          setSheetReq(null);
          setSheetCount(0);
        }}
        onConfirm={confirmCancel}
      />

      <Navbar />
    </div>
  );
}
