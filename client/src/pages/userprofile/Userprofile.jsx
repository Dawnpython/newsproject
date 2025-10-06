export default function Userprofile({ user, onLogout }) {
  return (
    <div style={{ padding: 20 }}>
      <h2>✅ Вы в аккаунте</h2>
      <p><b>Имя:</b> {user?.name}</p>
      <p><b>Email:</b> {user?.email}</p>
      {user?.phone && <p><b>Телефон:</b> {user?.phone}</p>}
      <button onClick={onLogout} style={{ marginTop: 12 }}>Выйти</button>
    </div>
  );
}
