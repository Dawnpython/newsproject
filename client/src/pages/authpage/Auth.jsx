import "/src/pages/authpage/Auth.css";
import Navbar from "/src/components/navbar/Navbar.jsx";

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
        <div className="step"></div>
        <div className="step"></div>
        <div className="step"></div>
      </div>
      <Navbar />
    </div>
  );
}
