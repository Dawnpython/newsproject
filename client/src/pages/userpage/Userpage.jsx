import "/src/pages/userpage/Userpage.css";

import Navbar from "../../components/navbar/Navbar";
import Hero from "../../blocks/hero/Hero";
import CategoryFirst from "/src/blocks/categoryfirst/CategoryFirst.jsx";
import Footer from "/src/blocks/footer/Footer.jsx";
import Formkey from "../../blocks/formkey/Formkey";
import Popularcategory from "../../blocks/ popularCategory/Popularcategory";
import Recomendation from "../../blocks/recomendation/Recomendation";
import Pr from "../../blocks/pr/Pr";
import Economycat from "../../blocks/economyCat/EconomyCat";
import  Subscribe from '/src/blocks/subscribe/Subscribe.jsx';


export default function Userpage() {
  return (
    <div className="userpage">
      <Hero />
      <CategoryFirst/>
      <Popularcategory/>
      <Recomendation/>
      <Pr/>
      <Economycat/>
      <Formkey/>
      <Subscribe/>
      <Footer/>
      <Navbar />
    </div>
  );
}
