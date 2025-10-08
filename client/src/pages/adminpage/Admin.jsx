// Adminpage.jsx
import { useEffect, useMemo, useState } from "react";

export default function Adminpage(){
  const API_BASE = "https://newsproject-tnkc.onrender.com";
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [tab, setTab] = useState("guides"); // 'guides' | 'news'
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null); // id гида, который сейчас сохраняется
  const [error, setError] = useState("");

  // Загрузка списка гидов
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

  // Помощник: преобразовать TIMESTAMPTZ в YYYY-MM-DD для <input type="date">
  function toDateInputValue(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    // формат YYYY-MM-DD в локальном времени
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Обратное: из YYYY-MM-DD сделать ISO-конец-дня (чтобы считалось «до включительно»)
  function toIsoEndOfDay(dateStr) {
    if (!dateStr) return null; // для удаления даты подписки
    const d = new Date(dateStr + "T23:59:59");
    return d.toISOString();
  }

  // Локальное обновление строки гида
  function updateGuideLocal(id, patch) {
    setGuides((prev) => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  }

  // Сохранение строки гида
  async function saveGuideRow(guide) {
    try {
      setSavingId(guide.id);
      setError("");
      const body = {
        is_active: Boolean(guide.is_active),
        subscription_until: guide.subscription_until ? guide.subscription_until : null,
        // categories тут можно тоже отправлять, если будешь редактировать
      };
      const r = await fetch(`${API_BASE}/api/admin/guides/${guide.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Save failed");
      const data = await r.json();
      // Обновим строку ответом сервера
      updateGuideLocal(guide.id, data.guide);
    } catch (e) {
      setError("Не удалось сохранить изменения");
    } finally {
      setSavingId(null);
    }
  }

  // Рендер одной строки
  function GuideRow({ g }) {
    const activeComputed = useMemo(() => {
      const flag = !!g.is_active;
      if (!flag) return false;
      if (!g.subscription_until) return true;
      return new Date(g.subscription_until) >= new Date();
    }, [g.is_active, g.subscription_until]);

    return (
      <tr key={g.id}>
        <td>{g.name}</td>
        <td>{g.phone || "-"}</td>
        <td>{g.telegram_username || "-"}</td>
        <td>{g.telegram_id || "-"}</td>
        <td style={{ minWidth: 140 }}>
          <label style={{ display:"inline-flex", alignItems:"center", gap: 8 }}>
            <input
              type="checkbox"
              checked={!!g.is_active}
              onChange={(e) => updateGuideLocal(g.id, { is_active: e.target.checked })}
            />
            {g.is_active ? "вкл." : "выкл."}
          </label>
        </td>
        <td style={{ minWidth: 200 }}>
          <input
            type="date"
            value={toDateInputValue(g.subscription_until)}
            onChange={(e) => {
              const iso = toIsoEndOfDay(e.target.value);
              updateGuideLocal(g.id, { subscription_until: iso });
            }}
          />
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {activeComputed ? "Активна" : "Не активна"}{" "}
            {g.subscription_until ? `(до ${toDateInputValue(g.subscription_until)})` : "(без даты)"}
          </div>
        </td>
        <td>
          <button
            disabled={savingId === g.id}
            onClick={() => saveGuideRow(g)}
            style={{ padding: "6px 10px", cursor: "pointer" }}
          >
            {savingId === g.id ? "Сохранение…" : "Сохранить"}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Админка</h1>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <button
          onClick={() => setTab("guides")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: tab === "guides" ? "#eee" : "white",
            cursor: "pointer",
          }}
        >
          Гиды
        </button>
        <button
          onClick={() => setTab("news")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: tab === "news" ? "#eee" : "white",
            cursor: "pointer",
          }}
        >
          Новости
        </button>
      </div>

      {tab === "guides" && (
        <div>
          {loading && <p>Загрузка…</p>}
          {error && <p style={{ color: "crimson" }}>{error}</p>}

          {!loading && guides.length === 0 && <p>Гидов пока нет.</p>}

          {guides.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Имя</th>
                    <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Телефон</th>
                    <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Telegram</th>
                    <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>TG ID</th>
                    <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Подписка</th>
                    <th style={{ padding: 8, borderBottom: "1px solid #eee" }}>Активна до</th>
                    <th style={{ padding: 8, borderBottom: "1px solid #eee" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {guides.map((g) => (
                    <GuideRow key={g.id} g={g} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "news" && (
        <div style={{ opacity: 0.7 }}>
          <p>Здесь позже будет управление новостями.</p>
        </div>
      )}
    </div>
  );
}
