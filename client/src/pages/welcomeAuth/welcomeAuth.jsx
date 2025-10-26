import "/src/pages/welcomeAuth/welcomeAuth.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Navbar from "/src/components/navbar/Navbar.jsx";
import Userprofile from "/src/pages/userprofile/Userprofile.jsx";

import firstStep from "/src/assets/auth/1.png";
import secondStep from "/src/assets/auth/2.png";
import thirdStep from "/src/assets/auth/3.png";


export default function WelcomeAuth() {
  const navigate = useNavigate();
  const API_BASE = "https://newsproject-tnkc.onrender.com";

  const [user, setUser] = useState(null);
  const [checkedAuth, setCheckedAuth] = useState(false);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCheckedAuth(true);
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);

          
          const isAdmin = data.user?.is_admin === true || data.user?.role === "admin";
          if (isAdmin) {
            navigate("/admin", { replace: true });
          }
        } else {
          localStorage.removeItem("token");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
      })
      .finally(() => setCheckedAuth(true));
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null); 
  };


  if (!checkedAuth) return null;


  if (user) {
  
    if (user?.is_admin === true || user?.role === "admin") {
      navigate("/admin", { replace: true });
      return null;
    }

    return (
      <div className="welcome-auth">
        <Userprofile user={user} onLogout={logout} />
        <Navbar />
      </div>
    );
  }


  return (
    <div className="welcome-auth">
      <h1>
        Войдите или зарегистрируйтесь,
        <br /> чтобы отправлять свои запросы
        <br />
        «местным»
      </h1>

      <div className="steps">
        <div className="step">
          <div className="step-num">1</div>
          <p>
            Вы пишите запрос,<br />
            мы рассылаем<br />
            его местным
          </p>
          <img width={174} height={51} src={firstStep} />
        </div>

        <div className="step">
          <div className="step-num">2</div>
          <p>
            Местные откликаются<br />
            и предлагают вам <br />
            свою помощь/услуги
          </p>
          <img width={150} height={75} src={secondStep} />
        </div>

        <div className="step">
          <div className="step-num">3</div>
          <p>
            Выбираете лучшее<br />
            предложение<br />
            и связываетесь напрямую
          </p>
          <img
            width={149}
            height={106}
            style={{ right: "20px", position: "absolute", bottom: "0" }}
            src={thirdStep}
          />
        </div>
      </div>

      <p>Все просто, без суеты и поисков!</p>

      <button className="authbut" onClick={() => navigate("/login?mode=register")}>
        Зарегистрироваться
      </button>
      <button className="logbut" onClick={() => navigate("/login?mode=login")}>
        Войти
      </button>

      <Navbar />
    </div>
  );
}
