import '/src/pages/loginPage/Login.css';
import { FaChevronLeft } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";


export default function Login() {
    
    
  const navigate = useNavigate();
  const location = useLocation();

  // читаем параметр mode из URL
  const queryParams = new URLSearchParams(location.search);
  const modeFromUrl = queryParams.get("mode");

  const [isRegister, setIsRegister] = useState(false);

  // при первом рендере смотрим, откуда пришли
  useEffect(() => {
    if (modeFromUrl === "register") setIsRegister(true);
    if (modeFromUrl === "login") setIsRegister(false);
  }, [modeFromUrl]);

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
            <input placeholder='Иван Иванов' type="text" />
            <label>Почта</label>
            <input placeholder='example@mail.ru' type="email" />
            <label>Телефон</label>
            <input placeholder='+7 (000) 000-00-00' type="password" />
            <label>Придумайте пароль</label>
            <input placeholder='*********' type="password" />
            <label>Повторите пароль</label>
            <input placeholder='*********' type="password" />
            <button>Зарегистрироваться</button>
            <div className="politics">
                
            </div>
            <a className="no-acc">
              Уже есть аккаунт?
              <span onClick={() => setIsRegister(false)}> Войти</span>
            </a>
          </>
        ) : (
          <>
            <label>Имя</label>
            <input type="text" />
            <label>Почта</label>
            <input type="email" />
            <button>Войти</button>
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
