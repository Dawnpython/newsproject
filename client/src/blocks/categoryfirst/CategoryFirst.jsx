import '/src/blocks/categoryfirst/CategoryFirst.css'
import '/src/assets/img-banner-local.png'

import {FaRegEnvelope} from "react-icons/fa";

import SlimCategory from '../../components/slimcategory/slimCategory';
import Fatcategory from "../../components/fatcategory/Fatcategory";

import { useNavigate } from "react-router-dom"; 

export default function CategoryFirst(){

    const navigate = useNavigate();
    return(
        <div className="category-first">
<SlimCategory/>
<Fatcategory/>
            <div className="info-bar-request">
<h1>Обращайтесь к местным<br/>
с любым запросом!</h1>
<button onClick={() => navigate("/application")}><FaRegEnvelope />Написать</button>
            </div>
        </div>
    )
}


