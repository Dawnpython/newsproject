import "/src/blocks/recomendation/Recomendation.css";

import logrec from '/src/assets/ logrec.png'
import instabanner from '/src/assets/img-inst-banner.png'

import Stories from "../../components/stories/Stories";
import Storiescat from "../../components/storiescat/Storiescat";

export default function Recomendation() {
  return (
    <div className="recomendation">
        <div className="rec-logo">
            <img src={logrec}></img>
        </div>
        <Stories/>
        <Storiescat/>
        <div className="insta-banner">
<img src={instabanner}></img>
 <p>Все статьи</p>
        </div>
    </div>
  );
}
