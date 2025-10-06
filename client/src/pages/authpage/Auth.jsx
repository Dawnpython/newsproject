import "/src/pages/authpage/Auth.css";
import Navbar from "/src/components/navbar/Navbar.jsx";
import Test from '/src/assets/auth/test.png'

export default function Auth() {
  return (
    <div className="auth-page">
      <h1>
        Войдите или зарегистрируйтесь,
        <br /> чтобы отправлять свои запросы
        <br />
        «местным»
      </h1>
      <div className="steps">
        <div className="step">
            <div className="step-num">1</div>
             <img style={{width:150}} src={Test} ></img>
        </div>
        <div className="step">
            <div className="step-num">2</div>
        </div>
        <div className="step">
            <div className="step-num">3</div>
        </div>
      </div>
      <Navbar />
    </div>
  );
}
