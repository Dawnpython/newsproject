import "/src/blocks/footer/Footer.css";
import logo from "/src/assets/logo.png";

export default function Footer() {
  return (
    <div className="footer">
      <div className="footer-part-1">
        <h1>
          О приложении
          <br />
          «В гостях к местным»
        </h1>
        <p>
          Мы делаем путешествия по России и СНГ простыми и честными. Турист
          получает всю нужную информацию в одном месте и напрямую связывается с
          местными — гидами, владельцами отелей, таксистами, предпринимателями
          организующими ваш отдых и досуг. <a>Читать далее</a>
        </p>
        <img src={logo}></img>
      </div>
      <div className="footer-part-2">
        <h1>
          Хочешь такое приложение
          <br />в своем городе/курорте?{" "}
        </h1>
        <p>Напишите нам - мы ищем местных партнеров</p>
        <button>Написать</button>
      </div>
      <div className="footer-part-3"></div>
    </div>
  );
}
