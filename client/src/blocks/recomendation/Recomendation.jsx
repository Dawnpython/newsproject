import "/src/blocks/recomendation/Recomendation.css";

import logrec from "/src/assets/ logrec.png";
import instabanner from "/src/assets/img-inst-banner.png";
import bannerlogo from "/src/assets/bannerlogo.png";

import Stories from "../../components/stories/Stories";
import Storiescat from "../../components/storiescat/Storiescat";

export default function Recomendation() {
  return (
    <div className="recomendation">
      <div className="rec-logo">
        <img src={logrec}></img>
      </div>
      <Stories />
      <Storiescat />
      <div className="insta-banner">
        <img className="instalogo" style={{width:96}}  src={bannerlogo}></img>
        <img style={{width:370}} src={instabanner}></img>
        <p>Все статьи</p>
        <button>Смотреть всё</button>
      </div>
    </div>
  );
}
