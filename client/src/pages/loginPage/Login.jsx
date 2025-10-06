import "/src/pages/loginPage/Login.css";
import { FaChevronLeft } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const modeFromUrl = queryParams.get("mode");

  const [isRegister, setIsRegister] = useState(false);

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

  // --- стейт полей логина ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginTouched, setLoginTouched] = useState({ email: false, password: false });
  const [loginSubmitted, setLoginSubmitted] = useState(false);

  useEffect(() => {
    if (modeFromUrl === "register") setIsRegister(true);
    if (modeFromUrl === "login") setIsRegister(false);
  }, [modeFromUrl]);

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

  const handleRegisterClick = () => {
    setSubmitted(true);
    markAllTouched();
    setAgreeTouched(true);
    if (!isValid) return;

    // TODO: отправка данных регистрации
  };

  const handleLoginClick = () => {
    setLoginSubmitted(true);
    setLoginTouched({ email: true, password: true });
    if (!isLoginValid) return;

    // TODO: отправка данных логина
  };

  // onBlur-хелперы
  const blur = (field) => () => setTouched((p) => ({ ...p, [field]: true }));
  const loginBlur = (field) => () => setLoginTouched((p) => ({ ...p, [field]: true }));

  // класс ошибки
  const showErr = (field) => (touched[field] || submitted) && errors[field] ? "error" : "";
  const showLoginErr = (field) =>
    (loginTouched[field] || loginSubmitted) && loginErrors[field] ? "error" : "";

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
              onBlur={blur("name")}
              className={showErr("name")}
            />

            <label>Почта</label>
            <input
              placeholder="example@mail.ru"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={blur("email")}
              className={showErr("email")}
            />

            <label>Телефон</label>
            <input
              placeholder="+7 (000) 000-00-00"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phone}
              onChange={(e) => {
                const onlyNums = e.target.value.replace(/\D/g, ""); // ← только цифры
                setPhone(onlyNums);
              }}
              onBlur={blur("phone")}
              className={showErr("phone")}
            />

            <label>Придумайте пароль</label>
            <input
              placeholder="*********"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={blur("password")}
              className={showErr("password")}
            />

            <label>Повторите пароль</label>
            <input
              placeholder="*********"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              onBlur={blur("password2")}
              className={showErr("password2")}
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

            <button onClick={handleRegisterClick} disabled={!isValid}>
              Зарегистрироваться
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
              onBlur={loginBlur("email")}
              className={showLoginErr("email")}
            />

            <label>Пароль</label>
            <input
              type="password"
              placeholder="*********"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onBlur={loginBlur("password")}
              className={showLoginErr("password")}
            />

            <button onClick={handleLoginClick} disabled={!isLoginValid}>Войти</button>
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
