// Adminpage.jsx
import { useEffect, useState } from "react";
import {
  FaSailboat,
  FaTaxi,
  FaUserTie,
  FaHotel,
  FaKey,
  FaUsers,
} from "react-icons/fa";
import "/src/pages/adminpage/Admin.css";
import Navbar from "../../components/navbar/Navbar";

const CATEGORY_OPTIONS = [
  { id: "boats", label: "Лодки и экскурсии на воде", Icon: FaSailboat },
  { id: "taxi", label: "Заказать такси", Icon: FaTaxi },
  { id: "guides", label: "Частные гиды", Icon: FaUserTie },
  { id: "hotels", label: "Отели и турбазы", Icon: FaHotel },
  { id: "rent", label: "Аренда жилья", Icon: FaKey },
  { id: "locals", label: "Местные жители", Icon: FaUsers },
];

function AdminCategoryPicker({ value = [], onChange }) {
  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };
  return (
    <div className="admin-cat-grid">
      {CATEGORY_OPTIONS.map(({ id, label, Icon }) => {
        const active = value.includes(id);
        return (
          <button
            key={id}
            type="button"
            className={`admin-cat-chip ${
              active ? "admin-cat-chip--active" : ""
            }`}
            onClick={() => toggle(id)}
          >
            <Icon className="admin-cat-ico" />
            <span className="admin-cat-text">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function Adminpage() {
  const API_BASE = "https://newsproject-tnkc.onrender.com";
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [tab, setTab] = useState("guides");
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
    description: "",
    avatar_url: "",
    avatar_public_id: "",
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

  // === Cloudinary upload ===
  async function uploadToCloudinary(file) {
    // 1) подпись с нашего API
    const sigRes = await fetch(`${API_BASE}/api/uploads/signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!sigRes.ok) throw new Error("Signature failed");
    const { timestamp, signature, folder, api_key, cloud_name } =
      await sigRes.json();

    // 2) отправляем файл в Cloudinary
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", api_key);
    form.append("timestamp", timestamp);
    form.append("signature", signature);
    form.append("folder", folder);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud_name}/auto/upload`,
      {
        method: "POST",
        body: form,
      }
    );
    if (!uploadRes.ok) throw new Error("Upload failed");
    const data = await uploadRes.json();
    return { url: data.secure_url, public_id: data.public_id };
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
    return () => {
      aborted = true;
    };
  }, [tab]);

  // === Edit modal handlers ===
  function openModal(guide) {
    setEditing({
      ...guide,
      subscription_until_date: toDateInputValue(guide.subscription_until),
      categories: guide.categories || [],
      description: guide.description || "",
      avatar_url: guide.avatar_url || "",
      avatar_public_id: guide.avatar_public_id || "",
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
        description: (editing.description || "").trim() || null,
        avatar_url: editing.avatar_url || null,
        avatar_public_id: editing.avatar_public_id || null,
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
      setGuides((prev) =>
        prev.map((g) => (g.id === editing.id ? data.guide : g))
      );
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
      description: "",
      avatar_url: "",
      avatar_public_id: "",
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

      const body = {
        name: (newGuide.name || "").trim(),
        phone: (newGuide.phone || "").trim() || null,
        telegram_username: (newGuide.telegram_username || "").trim() || null,
        telegram_id: newGuide.telegram_id ? Number(newGuide.telegram_id) : null,
        is_active: Boolean(newGuide.is_active),
        categories: newGuide.categories || [],
        subscription_until: iso,
        description: (newGuide.description || "").trim() || null,
        avatar_url: newGuide.avatar_url || null,
        avatar_public_id: newGuide.avatar_public_id || null,
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
        <h1 className="admin-title">Админка</h1>
        <div className="admin-tabs">
          <button
            className={`admin-tab ${
              tab === "guides" ? "admin-tab--active" : ""
            }`}
            onClick={() => setTab("guides")}
          >
            Гиды
          </button>
          <button
            className={`admin-tab ${tab === "news" ? "admin-tab--active" : ""}`}
            onClick={() => setTab("news")}
          >
            Новости
          </button>
        </div>
      </div>

      {tab === "guides" && (
        <section className="admin-section">
          <div className="admin-bar">
            <button
              className="admin-btn admin-btn--primary"
              onClick={openCreate}
            >
              + Добавить гида
            </button>
          </div>

          {loading && <p className="admin-muted">Загрузка…</p>}
          {error && <p className="admin-error">{error}</p>}
          {!loading && guides.length === 0 && (
            <p className="admin-muted">Гидов пока нет.</p>
          )}

          <div className="admin-cards">
            {guides.map((g) => {
              const active = isActiveComputed(g);
              return (
                <div
                  key={g.id}
                  className={`admin-card ${
                    active ? "admin-card--ok" : "admin-card--off"
                  }`}
                  onClick={() => openModal(g)}
                >
                  <div className="admin-card-top">
                    <div className="admin-card-name">{g.name}</div>
                    <span
                      className={`admin-pill ${
                        active ? "admin-pill--ok" : "admin-pill--off"
                      }`}
                    >
                      {active ? "Активна" : "Не активна"}
                    </span>
                  </div>

                  

                  <div className="admin-card-row">
                    <span className="admin-label">Изображение</span>
                    <span className="admin-value"><img className="admin-avatar-preview"  src={g.avatar_url} alt={`${g.name} avatar`} /></span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-label">Описание</span>
                    <span className="admin-value">{g.description || "—"}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-label">Телефон</span>
                    <span className="admin-value">{g.phone || "—"}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-label">Telegram</span>
                    <span className="admin-value">
                      {g.telegram_username || "—"}
                    </span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-label">TG ID</span>
                    <span className="admin-value">{g.telegram_id || "—"}</span>
                  </div>
                  <div className="admin-card-row">
                    <span className="admin-label">До</span>
                    <span className="admin-value">
                      {g.subscription_until
                        ? toDateInputValue(g.subscription_until)
                        : "без даты"}
                    </span>
                  </div>
                  {!!g.categories?.length && (
                    <div className="admin-card-tags">
                      {g.categories.map((c) => {
                        const meta = CATEGORY_OPTIONS.find((o) => o.id === c);
                        const Label = meta?.label || c;
                        const Icon = meta?.Icon || FaUsers;
                        return (
                          <span className="admin-tag" key={c}>
                            <Icon className="admin-tag-ico" />
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
            <div className="admin-modal-backdrop" onClick={closeModal}>
              <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3 className="admin-modal-title">Редактирование гида</h3>
                  <button
                    className="admin-icon-btn"
                    onClick={closeModal}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="admin-modal-body">
                  <div className="admin-form-row">
                    <label>Имя</label>
                    <input
                      type="text"
                      value={editing.name || ""}
                      onChange={(e) => setEditingField("name", e.target.value)}
                      disabled
                    />
                  </div>

                  <div className="admin-form-row">
                    <label>Описание</label>
                    <textarea
                      value={editing.description || ""}
                      onChange={(e) =>
                        setEditingField("description", e.target.value)
                      }
                      placeholder="Коротко о гиде: опыт, локации, услуги…"
                      rows={4}
                    />
                  </div>

                  <div className="admin-form-row admin-switch-row">
                    <label>Подписка включена</label>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={!!editing.is_active}
                        onChange={(e) =>
                          setEditingField("is_active", e.target.checked)
                        }
                      />
                      <span className="admin-slider" />
                    </label>
                  </div>

                  <div className="admin-form-row">
                    <label>Активна до</label>
                    <div className="admin-date-row">
                      <input
                        type="date"
                        value={editing.subscription_until_date || ""}
                        onChange={(e) =>
                          setEditingField(
                            "subscription_until_date",
                            e.target.value
                          )
                        }
                      />
                      {editing.subscription_until_date && (
                        <button
                          className="admin-btn admin-btn--secondary"
                          onClick={() =>
                            setEditingField("subscription_until_date", "")
                          }
                        >
                          Очистить
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="admin-form-row">
                    <label>Категории</label>
                    <AdminCategoryPicker
                      value={editing.categories || []}
                      onChange={(v) => setEditingField("categories", v)}
                    />
                  </div>

                  {/* аватар */}
                  <div className="admin-form-row">
                    <label>Фото (аватар)</label>
                    <div className="admin-file-row">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const { url, public_id } = await uploadToCloudinary(
                              file
                            );
                            setEditingField("avatar_url", url);
                            setEditingField("avatar_public_id", public_id);
                          } catch {
                            setError("Не удалось загрузить фото");
                          }
                        }}
                      />
                      {editing.avatar_url && (
                        <div className="admin-avatar-preview">
                          <img className="avatar-2" src={editing.avatar_url} alt="avatar preview" />
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={() => {
                              setEditingField("avatar_url", "");
                              setEditingField("avatar_public_id", "");
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="admin-modal-actions">
                  <button
                    className="admin-btn admin-btn--ghost"
                    onClick={closeModal}
                  >
                    Отмена
                  </button>
                  <button
                    className="admin-btn admin-btn--primary"
                    onClick={saveEditing}
                    disabled={saving}
                  >
                    {saving ? "Сохранение…" : "Сохранить"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CREATE MODAL */}
          {createOpen && (
            <div className="admin-modal-backdrop" onClick={closeCreate}>
              <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3 className="admin-modal-title">Добавить гида</h3>
                  <button
                    className="admin-icon-btn"
                    onClick={closeCreate}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="admin-modal-body">
                  <div className="admin-grid-2">
                    <div className="admin-form-row">
                      <label>Имя *</label>
                      <input
                        type="text"
                        value={newGuide.name}
                        onChange={(e) => setNewField("name", e.target.value)}
                        placeholder="Иван Петров"
                      />
                    </div>

                    <div className="admin-form-row">
                      <label>Описание</label>
                      <textarea
                        value={newGuide.description}
                        onChange={(e) =>
                          setNewField("description", e.target.value)
                        }
                        placeholder="Коротко о гиде: опыт, локации, услуги…"
                        rows={4}
                      />
                    </div>

                    <div className="admin-form-row">
                      <label>Телефон</label>
                      <input
                        type="text"
                        value={newGuide.phone}
                        onChange={(e) => setNewField("phone", e.target.value)}
                        placeholder="+79990001122"
                      />
                    </div>
                    <div className="admin-form-row">
                      <label>Telegram username</label>
                      <input
                        type="text"
                        value={newGuide.telegram_username}
                        onChange={(e) =>
                          setNewField("telegram_username", e.target.value)
                        }
                        placeholder="@username"
                      />
                    </div>
                    <div className="admin-form-row">
                      <label>Telegram ID</label>
                      <input
                        type="text"
                        value={newGuide.telegram_id}
                        onChange={(e) =>
                          setNewField("telegram_id", e.target.value)
                        }
                        placeholder="123456789"
                      />
                    </div>
                  </div>

                  <div className="admin-form-row admin-switch-row">
                    <label>Подписка включена</label>
                    <label className="admin-switch">
                      <input
                        type="checkbox"
                        checked={!!newGuide.is_active}
                        onChange={(e) =>
                          setNewField("is_active", e.target.checked)
                        }
                      />
                      <span className="admin-slider" />
                    </label>
                  </div>

                  <div className="admin-form-row">
                    <label>Активна до</label>
                    <div className="admin-date-row">
                      <input
                        type="date"
                        value={newGuide.subscription_until_date}
                        onChange={(e) =>
                          setNewField("subscription_until_date", e.target.value)
                        }
                      />
                      {newGuide.subscription_until_date && (
                        <button
                          className="admin-btn admin-btn--secondary"
                          onClick={() =>
                            setNewField("subscription_until_date", "")
                          }
                        >
                          Очистить
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="admin-form-row">
                    <label>Категории</label>
                    <AdminCategoryPicker
                      value={newGuide.categories}
                      onChange={(v) => setNewField("categories", v)}
                    />
                  </div>

                  {/* аватар */}
                  <div className="admin-form-row">
                    <label>Фото (аватар)</label>
                    <div className="admin-file-row">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const { url, public_id } = await uploadToCloudinary(
                              file
                            );
                            setNewField("avatar_url", url);
                            setNewField("avatar_public_id", public_id);
                          } catch {
                            setError("Не удалось загрузить фото");
                          }
                        }}
                      />
                      {newGuide.avatar_url && (
                        <div className="admin-avatar-preview">
                          <img src={newGuide.avatar_url} alt="avatar preview" />
                          <button
                            type="button"
                            className="admin-btn admin-btn--secondary"
                            onClick={() => {
                              setNewField("avatar_url", "");
                              setNewField("avatar_public_id", "");
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="admin-hint">
                      Рекомендуем до 2–3 МБ, формат JPG/PNG/WebP.
                    </div>
                  </div>
                </div>

                <div className="admin-modal-actions">
                  <button
                    className="admin-btn admin-btn--ghost"
                    onClick={closeCreate}
                  >
                    Отмена
                  </button>
                  <button
                    className="admin-btn admin-btn--primary"
                    onClick={createGuide}
                    disabled={creating || !newGuide.name.trim()}
                  >
                    {creating ? "Создание…" : "Создать"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "news" && (
        <section className="admin-section">
          <div className="admin-empty-block">
            <h3 className="admin-subtitle">Новости</h3>
            <p className="admin-muted">Раздел пока пустой.</p>
          </div>
        </section>
      )}
      <Navbar />
    </div>
  );
}
