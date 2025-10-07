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

/** адрес API */
const API_BASE = "https://newsproject-tnkc.onrender.com";

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
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };
  const clear = () => onChange([]);

  return (
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
                    <Icon className={`ms-row-ico ${checked ? "is-active" : ""}`} />
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

function RequestCard({ req, onAskCancel }) {
  const firstCat = req.categories?.[0];
  const catMeta = CATEGORY_OPTIONS.find((c) => c.id === firstCat);
  const Icon = catMeta?.Icon || FaUsers;

  return (
    <div className="rq-card">
      <div className="rq-mail">
        <span className="rq-mail-icon">✉️</span>
        {!!req.messages_cnt && <span className="rq-mail-count">{req.messages_cnt}</span>}
      </div>

      <div className="rq-head">
        <div className="rq-num">#{String(req.short_code).padStart(5, "0")}</div>
        <div className="rq-date">{formatDate(req.created_at)}</div>
      </div>

      <div className={`rq-badge cat-${firstCat || "default"}`}>
        <Icon className="rq-badge-ico" />
        <span>{catMeta?.label || "Запрос"}</span>
      </div>

      <div className="rq-text">{req.text}</div>

      <button className="rq-cancel" onClick={() => onAskCancel(req)}>
        Отменить
      </button>
    </div>
  );
}

/* ---------- Bottom Sheet ---------- */
function CancelSheet({ open, request, onClose, onConfirm }) {
  // блокируем скролл фона, пока открыт шит
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const count = request?.messages_cnt || 0;

  return (
    <>
      <div
        className={`sheet-backdrop ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`sheet ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <div className="sheet-handle" />
        <h3 id="sheet-title" className="sheet-title">Вы точно хотите<br/>отменить заявку?</h3>
        <p className="sheet-sub">
          На вашу заявку уже откликнулось <b>{count} человек</b>.<br/>
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

  const MAX = 150;

  // загрузка моих заявок
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
        setRequests(data.requests || []);
      } catch (e) {
        console.error(e);
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
      setRequests((prev) => [request, ...prev]);
      setCategories([]);
      setText("");
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const disabled = categories.length === 0 || text.trim() === "";

  // открыть подтверждение
  const askCancel = (req) => {
    setSheetReq(req);
    setSheetOpen(true);
  };

  // подтвердить отмену
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
    }
  };

  return (
    <div className="application">
      <div className="application-top">
        <form className="app-card" onSubmit={submit}>
          <h1 className="app-title">МЕСТНЫЕ<br/>ПОМОГУТ</h1>

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
            <span className="app-counter">{text.length}/{MAX}</span>
          </div>

          <button
            className={`app-submit ${disabled ? "disabled" : ""}`}
            type="submit"
            disabled={disabled || submitting}
          >
            {submitting ? "Отправляем…" : "Отправить"}
          </button>

          <div className="app-footer">
            <div className="app-avatars"><img src={People} /></div>
            <p className="app-note">
              В нашем сервисе — более 300 местных жителей и предпринимателей,
              готовых прямо сейчас откликнуться на ваш запрос
            </p>
          </div>
        </form>
      </div>

      <div className="application-bottom">
        {loading ? (
          <div className="empty-apps">Загрузка…</div>
        ) : requests.length === 0 ? (
          <div className="empty-apps">
            <img width={100} height={100} src={emptyBox} />
            <h1>Вы еще не сделали<br/>ни одного запроса</h1>
            <p>Оставьте заявку и получайте<br/>предложения — местные помогут!</p>
          </div>
        ) : (
          <div className="rq-list">
            {requests.map((r) => (
              <RequestCard key={r.id} req={r} onAskCancel={askCancel} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sheet подтверждения */}
      <CancelSheet
        open={sheetOpen}
        request={sheetReq}
        onClose={() => { setSheetOpen(false); setSheetReq(null); }}
        onConfirm={confirmCancel}
      />

      <Navbar />
    </div>
  );
}
