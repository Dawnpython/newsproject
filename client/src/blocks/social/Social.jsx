import "/src/blocks/social/Social.css";

import tgImg from "/src/assets/icons/sub/telegram.png";
import vkImg from "/src/assets/icons/sub/vk.png";

export default function Social() {
  return (
    <div className="subscribe-soc">
      <div className="sub-top-soc">
        <p>
          Подписывайтесь
          <br />
          на нас в социальных
          <br />
          сетях
        </p>
        <img style={{width:40}} src={tgImg}></img>
        <img style={{width:40}} src={vkImg}></img>
        
      </div>
    </div>
  );
}
