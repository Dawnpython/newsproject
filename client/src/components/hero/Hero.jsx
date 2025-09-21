import '/src/components/hero/Hero.css'

import { FaArrowRight,FaLocationArrow } from "react-icons/fa";


export default function Hero(){
    return(
        <div className="hero">
            <div className="position"><FaLocationArrow/>Алтай</div>
            <h1>ТЕЛЕЦКОЕ</h1>
            <p>В гости к местным</p>
            <div className="full-loc">
                <button>Всё о локации<FaArrowRight/></button>
            </div>
        </div>
    )
}