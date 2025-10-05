import "/src/blocks/subscribe/Subscribe.css";

import imgbackTop from "/src/assets/img-sm-banner-bg.png";
import tgImg from "/src/assets/icons/sub/telegram.png";
import vkImg from "/src/assets/icons/sub/vk.png";
import smileImg from '/src/assets/subsmiles.png'

export default function Subscribe() {
  return (
    <div className="subscribe">
      <div className="sub-top">
        <p>
          Подписывайтесь
          <br />
          на нас в социальных
          <br />
          сетях
        </p>
        <img style={{width:40}} src={tgImg}></img>
        <img style={{width:40}} src={vkImg}></img>
        <img className="backSub" src={imgbackTop}></img>
      </div>
      <div className="sub-bottom">
        <img src={smileImg}></img>
        <p>Пожаловаться на что-то<br/>
или предложить новость/статью</p>
<button>Написать</button>
      </div>
    </div>
  );
}
