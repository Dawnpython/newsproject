// Adminpage.jsx
import { useEffect, useMemo, useState } from "react";
import { FaSailboat, FaTaxi, FaUserTie, FaHotel, FaKey, FaUsers } from "react-icons/fa6";
import "./admin.css";

const CATEGORY_OPTIONS = [
  { id: "boats",  label: "Лодки и экскурсии на воде", Icon: FaSailboat },
  { id: "taxi",   label: "Заказать такси",            Icon: FaTaxi },
  { id: "guides", label: "Частные гиды",              Icon: FaUserTie },
  { id: "hotels", label: "Отели и турбазы",           Icon: FaHotel },
  { id: "rent",   label: "Аренда жилья",              Icon: FaKey },
  { id: "locals", label: "Местные жители",            Icon: FaUsers },
];

function CategoryPicker({ value = [], onChange }) {
  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };
  return (
    <div className="cat-grid">
      {CATEGORY_OPTIONS.map(({ id, label, Icon }) => {
        const active = value.includes(id);
        return (
          <button
            key={id}
            type="button"
            className={`cat-chip ${active ? "active" : ""}`}
            onClick={() => toggle(id)}
          >
            <Icon className="cat-ico" />
            <span className="cat-text">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Adminpage(){
  const API_BASE = "https://newsproject-tnkc.onrender.com";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [tab, setTab] = useState("guides"); // 'guides' | 'news'
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGuide, setNewGuide] = useState({
    name: "",
    phone: "",
    telegram_username: "",
    telegram_id: "",
    is_active: true,
    subscription_until_date: "",
    categories: [],
  });

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

  // === Edit modal handlers ===
  function openModal(guide) {
    setEditing({
      ...guide,
      subscription_until_date: toDateInputValue(guide.subscription_until),
      categories: guide.categories || [],
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
      const iso = editing.subscription_until_date
        ? toIsoEndOfDay(editing.subscription_until_date)
        : null;
      const body = {
        is_active: Boolean(editing.is_active),
        subscription_until: iso,
        categories: editing.categories || [],
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
      setGuides((prev) => prev.map((g) => (g.id === editing.id ? data.guide : g)));
      closeModal();
    } catch (e) {
      setError("Не удалось сохранить изменения");
    } finally {
      setSaving(false);
    }
  }

  // === Create modal handlers ===
  function openCreate() {
    setNewGuide({
      name: "",
      phone: "",
      telegram_username: "",
      telegram_id: "",
      is_active: true,
      subscription_until_date: "",
      categories: [],
    });
    setCreateOpen(true);
  }
  function closeCreate() {
    setCreateOpen(false);
  }
  function setNewField(field, value) {
    setNewGuide((prev) => ({ ...prev, [field]: value }));
  }
  async function createGuide() {
    try {
      setCreating(true);
      const iso = newGuide.subscription_until_date
        ? toIsoEndOfDay(newGuide.subscription_until_date)
        : null;

      // backend ожидается: name, phone, telegram_username, telegram_id, is_active, categories, subscription_until
      const body = {
        name: (newGuide.name || "").trim(),
        phone: (newGuide.phone || "").trim() || null,
        telegram_username: (newGuide.telegram_username || "").trim() || null,
        telegram_id: newGuide.telegram_id ? Number(newGuide.telegram_id) : null,
        is_active: Boolean(newGuide.is_active),
        categories: newGuide.categories || [],
        subscription_until: iso,
      };

      const r = await fetch(`${API_BASE}/api/admin/guides`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Create failed");
      const data = await r.json();
      setGuides((prev) => [data.guide, ...prev]);
      closeCreate();
    } catch (e) {
      setError("Не удалось создать гида");
    } finally {
      setCreating(false);
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
          <div className="bar">
            <button className="btn primary" onClick={openCreate}>+ Добавить гида</button>
          </div>

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
                      {g.categories.map((c) => {
                        const meta = CATEGORY_OPTIONS.find((o) => o.id === c);
                        const Label = meta?.label || c;
                        const Icon = meta?.Icon || FaUsers;
                        return (
                          <span className="tag" key={c}>
                            <Icon className="tag-ico" />
                            {Label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* EDIT MODAL */}
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
                  </div>

                  <div className="form-row">
                    <label>Категории</label>
                    <CategoryPicker
                      value={editing.categories || []}
                      onChange={(v) => setEditingField("categories", v)}
                    />
                    <div className="hint">Выберите, по каким категориям гид будет получать заявки.</div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn ghost" onClick={closeModal}>Отмена</button>
                  <button className="btn primary" onClick={saveEditing} disabled={saving}>
                    {saving ? "Сохранение…" : "Сохранить"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CREATE MODAL */}
          {createOpen && (
            <div className="modal-backdrop" onClick={closeCreate}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>Добавить гида</h3>
                  <button className="icon-btn" onClick={closeCreate} aria-label="Close">✕</button>
                </div>

                <div className="modal-body">
                  <div className="grid-2">
                    <div className="form-row">
                      <label>Имя *</label>
                      <input
                        type="text"
                        value={newGuide.name}
                        onChange={(e) => setNewField("name", e.target.value)}
                        placeholder="Иван Петров"
                      />
                    </div>
                    <div className="form-row">
                      <label>Телефон</label>
                      <input
                        type="text"
                        value={newGuide.phone}
                        onChange={(e) => setNewField("phone", e.target.value)}
                        placeholder="+79990001122"
                      />
                    </div>
                    <div className="form-row">
                      <label>Telegram username</label>
                      <input
                        type="text"
                        value={newGuide.telegram_username}
                        onChange={(e) => setNewField("telegram_username", e.target.value)}
                        placeholder="@username"
                      />
                    </div>
                    <div className="form-row">
                      <label>Telegram ID</label>
                      <input
                        type="text"
                        value={newGuide.telegram_id}
                        onChange={(e) => setNewField("telegram_id", e.target.value)}
                        placeholder="123456789"
                      />
                    </div>
                  </div>

                  <div className="form-row switch-row">
                    <label>Подписка включена</label>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={!!newGuide.is_active}
                        onChange={(e) => setNewField("is_active", e.target.checked)}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div className="form-row">
                    <label>Активна до</label>
                    <div className="date-row">
                      <input
                        type="date"
                        value={newGuide.subscription_until_date}
                        onChange={(e) => setNewField("subscription_until_date", e.target.value)}
                      />
                      {newGuide.subscription_until_date && (
                        <button
                          className="btn secondary"
                          onClick={() => setNewField("subscription_until_date", "")}
                        >
                          Очистить
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <label>Категории</label>
                    <CategoryPicker
                      value={newGuide.categories}
                      onChange={(v) => setNewField("categories", v)}
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn ghost" onClick={closeCreate}>Отмена</button>
                  <button className="btn primary" onClick={createGuide} disabled={creating || !newGuide.name.trim()}>
                    {creating ? "Создание…" : "Создать"}
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
