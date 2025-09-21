import '/src/blocks/categoryfirst/CategoryFirst.css'
import '/src/assets/img-banner-local.png'

import {FaRegEnvelope} from "react-icons/fa";

export default function CategoryFirst(){
    return(
        <div className="category-first">
            <div className="info-bar-request">
<h1>Обращайтесь к местным<br/>
с любым запросом!</h1>
<button><FaRegEnvelope />Написать</button>
            </div>
        </div>
    )
}


