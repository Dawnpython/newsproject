import "/src/pages/loginPage/Login.css";
import { FaChevronLeft } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import AccountTest from "/src/pages/userprofile/Userprofile.jsx"; 

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const API_BASE = "https://newsproject-tnkc.onrender.com";

  const queryParams = new URLSearchParams(location.search);
  const modeFromUrl = queryParams.get("mode");

  const [isRegister, setIsRegister] = useState(false);

  // auth state
  const [user, setUser] = useState(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  // --- стейт полей регистрации ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    password: false,
    password2: false,
  });

  const [agree, setAgree] = useState(false);
  const [agreeTouched, setAgreeTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false); // регистрация

  // --- стейт полей логина ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginTouched, setLoginTouched] = useState({ email: false, password: false });
  const [loginSubmitted, setLoginSubmitted] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false); // логин

  useEffect(() => {
    if (modeFromUrl === "register") setIsRegister(true);
    if (modeFromUrl === "login") setIsRegister(false);
  }, [modeFromUrl]);

  // ==== проверка токена при загрузке страницы ====
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCheckedAuth(true);
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        if (data?.user) setUser(data.user);
        else localStorage.removeItem("token");
      })
      .catch(() => {
        localStorage.removeItem("token");
      })
      .finally(() => setCheckedAuth(true));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    // при желании: navigate("/login?mode=login");
  };

  // --- валидация регистрации ---
  const errors = useMemo(() => {
    const e = {};
    if (!name.trim()) e.name = true;
    if (!email.trim() || !email.includes("@") || /\s/.test(email)) e.email = true;
    if (!phone.trim()) e.phone = true;
    if (!password) e.password = true;
    if (!password2 || password2 !== password) e.password2 = true;
    if (!agree) e.agree = true;
    return e;
  }, [name, email, phone, password, password2, agree]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  // --- валидация логина ---
  const loginErrors = useMemo(() => {
    const e = {};
    if (!loginEmail.trim() || !loginEmail.includes("@") || /\s/.test(loginEmail)) e.email = true;
    if (!loginPassword) e.password = true;
    return e;
  }, [loginEmail, loginPassword]);

  const isLoginValid = useMemo(() => Object.keys(loginErrors).length === 0, [loginErrors]);

  const markAllTouched = () =>
    setTouched({ name: true, email: true, phone: true, password: true, password2: true });

  // === РЕГИСТРАЦИЯ ===
  const handleRegisterClick = async () => {
    setSubmitted(true);
    markAllTouched();
    setAgreeTouched(true);
    if (!isValid || loading) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          password2,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        switch (data?.error) {
          case "EMAIL_INVALID":
            setTouched((p) => ({ ...p, email: true }));
            alert("Некорректная почта");
            break;
          case "PASSWORDS_NOT_MATCH":
            setTouched((p) => ({ ...p, password2: true }));
            alert("Пароли не совпадают");
            break;
          case "USER_EXISTS":
            setTouched((p) => ({ ...p, email: true }));
            alert("Пользователь с такой почтой/телефоном уже существует");
            break;
          default:
            alert("Ошибка регистрации. Попробуйте ещё раз");
        }
        return;
      }

      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.user) setUser(data.user); // <<< сразу считаем пользователя авторизованным
      // navigate("/"); // если нужно сразу увести на главную
    } catch (e) {
      console.error("Register error:", e);
      alert("Сеть/сервер недоступен. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  // === ЛОГИН ===
  const handleLoginClick = async () => {
    setLoginSubmitted(true);
    setLoginTouched({ email: true, password: true });
    if (!isLoginValid || loginLoading) return;

    try {
      setLoginLoading(true);
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        switch (data?.error) {
          case "EMAIL_INVALID":
            setLoginTouched((p) => ({ ...p, email: true }));
            alert("Некорректная почта");
            break;
          case "PASSWORD_REQUIRED":
            setLoginTouched((p) => ({ ...p, password: true }));
            alert("Введите пароль");
            break;
          case "INVALID_CREDENTIALS":
            setLoginTouched({ email: true, password: true });
            alert("Неверная почта или пароль");
            break;
          default:
            alert("Ошибка входа. Попробуйте ещё раз");
        }
        return;
      }

      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.user) setUser(data.user); // <<< авторизовали
      // navigate("/");
    } catch (e) {
      console.error("Login error:", e);
      alert("Сеть/сервер недоступен. Попробуйте ещё раз.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ======= РЕНДЕР =======
  if (!checkedAuth) {
    // можно сделать красивый лоадер
    return null;
  }

  if (user) {
    return <AccountTest user={user} onLogout={logout} />;
  }

  // ниже — твоя форма как была
  return (
    <div className="login-container">
      <div className="title" onClick={() => navigate("/")}>
        <FaChevronLeft className="back-icon" />
        {isRegister ? "Создать аккаунт" : "Войти в аккаунт"}
      </div>

      <div className="login-content">
        {isRegister ? (
          <>
            <label>Имя</label>
            <input
              placeholder="Иван Иванов"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, name: true }))}
              className={(touched.name || submitted) && errors.name ? "error" : ""}
            />

            <label>Почта</label>
            <input
              placeholder="example@mail.ru"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              className={(touched.email || submitted) && errors.email ? "error" : ""}
            />

            <label>Телефон</label>
            <input
              placeholder="+7 (000) 000-00-00"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
              className={(touched.phone || submitted) && errors.phone ? "error" : ""}
            />

            <label>Придумайте пароль</label>
            <input
              placeholder="*********"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, password: true }))}
              className={(touched.password || submitted) && errors.password ? "error" : ""}
            />

            <label>Повторите пароль</label>
            <input
              placeholder="*********"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, password2: true }))}
              className={(touched.password2 || submitted) && errors.password2 ? "error" : ""}
            />

            <label className="agree-row">
              <input
                type="checkbox"
                className={`checkbox-20${(!agree && (agreeTouched || submitted)) ? " error" : ""}`}
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                onBlur={() => setAgreeTouched(true)}
              />
              <span>
                Согласен на обработку персональных данных в соответствии с{" "}
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Политикой конфиденциальности
                </a>
              </span>
            </label>

            <button onClick={handleRegisterClick} disabled={!isValid || loading}>
              {loading ? "Загрузка..." : "Зарегистрироваться"}
            </button>

            <div className="politics"></div>
            <a className="no-acc">
              Уже есть аккаунт?
              <span onClick={() => setIsRegister(false)}> Войти</span>
            </a>
          </>
        ) : (
          <>
            <label>Почта</label>
            <input
              type="email"
              placeholder="example@mail.ru"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              onBlur={() => setLoginTouched((p) => ({ ...p, email: true }))}
              className={(loginTouched.email || loginSubmitted) && loginErrors.email ? "error" : ""}
            />

            <label>Пароль</label>
            <input
              type="password"
              placeholder="*********"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onBlur={() => setLoginTouched((p) => ({ ...p, password: true }))}
              className={(loginTouched.password || loginSubmitted) && loginErrors.password ? "error" : ""}
            />

            <button onClick={handleLoginClick} disabled={!isLoginValid || loginLoading}>
              {loginLoading ? "Входим..." : "Войти"}
            </button>
            <a>Забыли пароль?</a>
            <a className="no-acc">
              Нет аккаунта?
              <span onClick={() => setIsRegister(true)}> Зарегистрируйтесь</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
