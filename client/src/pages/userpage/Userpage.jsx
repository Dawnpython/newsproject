import "/src/pages/userpage/Userpage.css";

import Navbar from "../../components/navbar/Navbar";
import Hero from "../../blocks/hero/Hero";
import CategoryFirst from "/src/blocks/categoryfirst/CategoryFirst.jsx";

export default function Userpage() {
  return (
    <div className="userpage">
      <Hero />
      <CategoryFirst/>
      <Navbar />
    </div>
  );
}
