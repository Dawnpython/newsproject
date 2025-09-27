import "/src/blocks/recomendation/Recomendation.css";

import logrec from '/src/assets/ logrec.png'

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
    </div>
  );
}
