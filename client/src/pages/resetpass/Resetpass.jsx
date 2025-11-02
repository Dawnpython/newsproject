// src/pages/resetPassword/ResetPassword.jsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = "https://newsproject-dx8n.onrender.com";

  const token = new URLSearchParams(location.search).get('token') || '';
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!p1 || p1 !== p2) { alert('Пароли не совпадают'); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: p1, password2: p2 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error === 'TOKEN_INVALID_OR_EXPIRED'
          ? 'Ссылка недействительна или истекла'
          : 'Ошибка. Попробуйте ещё раз');
        return;
      }
      alert('Пароль обновлён. Войдите с новым паролем.');
      navigate('/login?mode=login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  if (!token) return <div style={{ padding: 16 }}>Некорректная или пустая ссылка</div>;

  return (
    <div className="reset-container" style={{ padding: 16 }}>
      <h2>Новый пароль</h2>
      <input type="password" placeholder="Новый пароль" value={p1} onChange={(e)=>setP1(e.target.value)} />
      <input type="password" placeholder="Повторите пароль" value={p2} onChange={(e)=>setP2(e.target.value)} />
      <button onClick={submit} disabled={loading}>{loading ? 'Сохраняем…' : 'Сохранить'}</button>
    </div>
  );
}
