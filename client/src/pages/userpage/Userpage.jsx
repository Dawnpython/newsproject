import '/src/pages/userpage/Userpage.css'

import Navbar from '../../components/navbar/Navbar';
import Hero from '../../components/hero/Hero';

export default function Userpage() {
  return (
    <div className="userpage">
      <Hero/>
        <Navbar/>
    </div>
  );
}
