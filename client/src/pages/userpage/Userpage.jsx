import "/src/pages/userpage/Userpage.css";

import Navbar from "../../components/navbar/Navbar";
import Hero from "../../blocks/hero/Hero";
import CategoryFirst from "/src/blocks/categoryfirst/CategoryFirst.jsx";
import Footer from "../../blocks/footer/footer";

export default function Userpage() {
  return (
    <div className="userpage">
      <Hero />
      <CategoryFirst/>
      <Footer/>
      <Navbar />
    </div>
  );
}
