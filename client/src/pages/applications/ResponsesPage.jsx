// /src/pages/applications/ResponsesPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "/src/components/navbar/Navbar.jsx";
import { FiArrowLeft } from "react-icons/fi";

import '/src/pages/applications/ResponsesPage.css'
const API_BASE = "https://newsproject-tnkc.onrender.com";

function GuideProfileModal({ open, guide, onClose }) {
  if (!open || !guide) return null;

  const phoneDigits = (guide.phone || "").replace(/\D/g, "");
  const telHref = phoneDigits ? `tel:+${phoneDigits}` : null;
  const tgHref =
    guide.telegram_username
      ? `https://t.me/${guide.telegram_username}`
      : guide.telegram_id
      ? `https://t.me/user?id=${guide.telegram_id}`
      : null;

  return (
    <>
      <div className={`sheet-backdrop ${open ? "is-open" : ""}`} onClick={onClose} />
      <aside className={`sheet is-open`} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <div className="gp-card">
          <img className="gp-avatar" src={guide.avatar_url || "/placeholder-avatar.png"} />
          <h2 className="gp-name">{guide.name}</h2>
          <div className="gp-sub">{guide.org_title || "Местный гид"}</div>

          {telHref && (
            <a className="btn btn-success" href={telHref}>
              📞 {guide.phone}
            </a>
          )}
          {tgHref && (
            <a className="btn btn-primary" href={tgHref} target="_blank" rel="noreferrer">
              ✈️ Написать в Telegram
            </a>
          )}
          {!telHref && !tgHref && (
            <div className="gp-empty">Контакты не указаны</div>
          )}

          <button className="btn btn-outline" onClick={onClose}>Закрыть</button>
        </div>
      </aside>
    </>
  );
}

export default function ResponsesPage() {
  const navigate = useNavigate();
  const { requestId } = useParams();

  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalGuide, setModalGuide] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/account", { replace: true });

    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_BASE}/api/requests/${requestId}/responses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error("failed");
        const data = await r.json();
        setResponses(data.responses || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId, navigate]);

  const openGuide = async (guideId) => {
    const token = localStorage.getItem("token");
    try {
      const r = await fetch(`${API_BASE}/api/guides/${guideId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { guide } = await r.json();
      setModalGuide(guide);
      setModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="application responses-page">
      <div className="responses-top">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Назад
        </button>
        <h1 className="responses-title">Отклики</h1>
      </div>

      {loading ? (
        <div className="empty-apps">Загрузка…</div>
      ) : responses.length === 0 ? (
        <div className="empty-apps">
          <h2>Пока нет откликов</h2>
          <p>Как только появятся — мы покажем их здесь.</p>
        </div>
      ) : (
        <div className="resp-list">
          {responses.map((it) => (
            <article key={it.id} className="resp-card">
              <div className="resp-head">
                <img className="resp-ava" src={it.guide.avatar_url || "/placeholder-avatar.png"} />
                <div className="resp-meta">
                  <div className="resp-name">{it.guide.name}</div>
                  <div className="resp-role">{it.guide.org_title || it.guide.role || "Местный гид"}</div>
                </div>
              </div>

              <div className={`resp-bubble ${it.is_new ? "is-new" : ""}`}>
                {it.text}
              </div>

              <button className="btn btn-outline" onClick={() => openGuide(it.guide.id)}>
                Связаться
              </button>
            </article>
          ))}
        </div>
      )}

      <GuideProfileModal open={modalOpen} guide={modalGuide} onClose={() => setModalOpen(false)} />
      <Navbar />
    </div>
  );
}
