import "/src/blocks/formkey/Formkey.css";

import { FaRegEnvelope } from "react-icons/fa";

import People from '/src/assets/People.png'

export default function Formkey() {
  return (
    <div className="formkey">
      <form>
        <h1>
          Местные помогут организовать
          <br />
          Вам отдых<span> «ПОД КЛЮЧ»</span>{" "}
        </h1>
        <p>Напишите свой запрос в свободной форме</p>
        <textarea
  className="request"
  placeholder={`Например, «Приехали на 3 дня,семьей 5\n человек,предложите пожалуйста дом с тремя комнатами,поближе к воде»`}
  rows={3}
/>
        <div className="form-row">
        <img src={People}></img>
        <p>
          На Ваш запрос могут
          <br />
          откликнуться более
          <br />
          500 местных жителей
        </p>
        <button>
          <FaRegEnvelope />
          Отправить
        </button>
        </div>
      </form>
    </div>
  );
}
