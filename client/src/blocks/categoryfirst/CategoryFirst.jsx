import '/src/blocks/categoryfirst/CategoryFirst.css'
import '/src/assets/img-banner-local.png'

import {FaRegEnvelope} from "react-icons/fa";

import SlimCategory from '../../components/slimcategory/slimCategory';

export default function CategoryFirst(){
    return(
        <div className="category-first">
<SlimCategory/>
            <div className="info-bar-request">
<h1>Обращайтесь к местным<br/>
с любым запросом!</h1>
<button><FaRegEnvelope />Написать</button>
            </div>
        </div>
    )
}


