import '/src/blocks/helper/Helper.css'
import { useNavigate } from "react-router-dom";
import Peoples from "/src/assets/People.png";

export default function Helper() {
   const navigate = useNavigate();
  return (
    <div className="help-container">
    <div className="help-block">
      <div className="help-top">
        <h1>
          Нужна помощь
          <br />
          местных?
        </h1>
      </div>
      <div className="help-mid">
        <p>
          В нашем сервисе - более 300* местных
          <br /> жителей и предпринимателей, готовых
          <br /> прямо сейчас откликнуться на ваш запрос
        </p>
        <img src={Peoples}></img>
      </div>
      <div className="help-bottom">
        <p>
          Пиши, сервис
          <br />
          бесплатный
        </p>
        <button onClick={() => navigate("/application")}>Написать</button>
      </div>
    </div>
    </div>
  );
}
