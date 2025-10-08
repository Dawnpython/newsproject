// Adminpage.jsx
import { useEffect, useMemo, useState } from "react";
import "/src/pages/adminpage/Admin.css";

export default function Adminpage(){
  const API_BASE = "https://newsproject-tnkc.onrender.com";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [tab, setTab] = useState("guides"); // 'guides' | 'news'
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // объект текущего гида
  const [saving, setSaving] = useState(false);

  // === Helpers ===
  function toDateInputValue(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  function toIsoEndOfDay(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr + "T23:59:59");
    return d.toISOString();
  }
  function isActiveComputed(g) {
    if (!g?.is_active) return false;
    if (!g?.subscription_until) return true;
    return new Date(g.subscription_until) >= new Date();
  }

  // === Load guides ===
  useEffect(() => {
    if (tab !== "guides") return;
    let aborted = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const r = await fetch(`${API_BASE}/api/admin/guides`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error("Failed to load guides");
        const data = await r.json();
        if (!aborted) setGuides(data.guides || []);
      } catch (e) {
        if (!aborted) setError("Не удалось загрузить гидов");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    load();
    return () => { aborted = true; };
  }, [tab]);

  // === UI Handlers ===
  function openModal(guide) {
    setEditing({
      ...guide,
      // для удобства редактирования — локальное поле с датой формата YYYY-MM-DD
      subscription_until_date: toDateInputValue(guide.subscription_until),
    });
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function setEditingField(field, value) {
    setEditing((prev) => ({ ...prev, [field]: value }));
  }

  async function saveEditing() {
    if (!editing) return;
    try {
      setSaving(true);

      // нормализуем дату
      const iso = editing.subscription_until_date
        ? toIsoEndOfDay(editing.subscription_until_date)
        : null;

      const body = {
        is_active: Boolean(editing.is_active),
        subscription_until: iso,
        // если позже захочешь редактировать категории — добавим здесь
      };

      const r = await fetch(`${API_BASE}/api/admin/guides/${editing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Save failed");
      const data = await r.json();

      // обновим в списке
      setGuides((prev) => prev.map((g) => (g.id === editing.id ? data.guide : g)));

      closeModal();
    } catch (e) {
      setError("Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <h1>Админка</h1>
        <div className="tabs">
          <button
            className={`tab ${tab === "guides" ? "active" : ""}`}
            onClick={() => setTab("guides")}
          >
            Гиды
          </button>
          <button
            className={`tab ${tab === "news" ? "active" : ""}`}
            onClick={() => setTab("news")}
          >
            Новости
          </button>
        </div>
      </div>

      {tab === "guides" && (
        <section>
          {loading && <p className="muted">Загрузка…</p>}
          {error && <p className="error">{error}</p>}
          {!loading && guides.length === 0 && <p className="muted">Гидов пока нет.</p>}

          <div className="cards">
            {guides.map((g) => {
              const active = isActiveComputed(g);
              return (
                <div
                  key={g.id}
                  className={`card ${active ? "ok" : "off"}`}
                  onClick={() => openModal(g)}
                >
                  <div className="card-top">
                    <div className="card-name">{g.name}</div>
                    <span className={`pill ${active ? "pill-ok" : "pill-off"}`}>
                      {active ? "Активна" : "Не активна"}
                    </span>
                  </div>
                  <div className="card-row">
                    <span className="label">Телефон</span>
                    <span className="value">{g.phone || "—"}</span>
                  </div>
                  <div className="card-row">
                    <span className="label">Telegram</span>
                    <span className="value">{g.telegram_username || "—"}</span>
                  </div>
                  <div className="card-row">
                    <span className="label">TG ID</span>
                    <span className="value">{g.telegram_id || "—"}</span>
                  </div>
                  <div className="card-row">
                    <span className="label">До</span>
                    <span className="value">
                      {g.subscription_until ? toDateInputValue(g.subscription_until) : "без даты"}
                    </span>
                  </div>
                  {!!g.categories?.length && (
                    <div className="card-tags">
                      {g.categories.map((c) => (
                        <span className="tag" key={c}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* MODAL */}
          {modalOpen && editing && (
            <div className="modal-backdrop" onClick={closeModal}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Редактирование гида</h3>
                  <button className="icon-btn" onClick={closeModal} aria-label="Close">✕</button>
                </div>

                <div className="modal-body">
                  <div className="form-row">
                    <label>Имя</label>
                    <input
                      type="text"
                      value={editing.name || ""}
                      onChange={(e) => setEditingField("name", e.target.value)}
                      disabled
                    />
                  </div>
                  <div className="form-row">
                    <label>Телеграм</label>
                    <input
                      type="text"
                      value={editing.telegram_username || ""}
                      onChange={(e) => setEditingField("telegram_username", e.target.value)}
                      disabled
                    />
                  </div>

                  <div className="form-row switch-row">
                    <label>Подписка включена</label>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={!!editing.is_active}
                        onChange={(e) => setEditingField("is_active", e.target.checked)}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div className="form-row">
                    <label>Активна до</label>
                    <div className="date-row">
                      <input
                        type="date"
                        value={editing.subscription_until_date || ""}
                        onChange={(e) =>
                          setEditingField("subscription_until_date", e.target.value)
                        }
                      />
                      {editing.subscription_until_date && (
                        <button
                          className="btn secondary"
                          onClick={() => setEditingField("subscription_until_date", "")}
                        >
                          Очистить
                        </button>
                      )}
                    </div>
                    <div className="hint">
                      Если дата пустая — подписка без ограничения по дате.
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn ghost" onClick={closeModal}>Отмена</button>
                  <button
                    className="btn primary"
                    onClick={saveEditing}
                    disabled={saving}
                  >
                    {saving ? "Сохранение…" : "Сохранить"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "news" && (
        <section>
          <div className="empty-block">
            <h3>Новости</h3>
            <p className="muted">Раздел пока пустой.</p>
          </div>
        </section>
      )}
    </div>
  );
}
