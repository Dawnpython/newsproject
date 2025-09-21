import "/src/pages/userpage/Userpage.css";

import Navbar from "../../components/navbar/Navbar";
import Hero from "../../blocks/hero/Hero";
import CategoryFirst from "/src/pages/userpage/Userpage.jsx";

export default function Userpage() {
  return (
    <div className="userpage">
      <Hero />
     
      <Navbar />
    </div>
  );
}
