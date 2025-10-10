import "/src/blocks/formkey/Formkey.css";

import { FaRegEnvelope } from "react-icons/fa";

import People from "/src/assets/People.png";
import formkeyBackground from "/src/assets/img-form-mountain.png";
import feedbackImage from '/src/assets/img-form-message.png'

import { useNavigate } from "react-router-dom"; 

export default function Formkey() {

  const navigate = useNavigate();

  return (
    <div className="formkeycon">
      <div className="formkey">
        <div className="top-form">
          <img src={People}></img>
          <p>
            В нашем сервисе - более 300 местных
            <br />
            жителей и предпринимателей, готовых
            <br />
            прямо сейчас откликнуться на ваш запрос
          </p>
        </div>
        <div className="middle-form">
          <h1>Хотите, чтобы местные<br/> организовали Ваш<br/> отдых <span>«под ключ»?</span> </h1>
          <p>Напишите свой запрос в свободной форме</p>
        </div>
        <div className="low-form">
          <img src={feedbackImage}></img>
          <button onClick={() => navigate("/application")}>
          <FaRegEnvelope />
          Отправить
        </button>
        </div>
        <img className="formkeyBackground" src={formkeyBackground}></img>
        
      </div>
    </div>
  );
}
