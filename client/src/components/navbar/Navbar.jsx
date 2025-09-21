import { FaHome, FaMapMarkedAlt, FaUsers, FaCompass, FaUser } from "react-icons/fa";
import '/src/components/navbar/Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-item">
        <FaHome size={20} />
        <span>Главная</span>
      </div>
      <div className="nav-item">
        <FaMapMarkedAlt size={20} />
        <span>Карта</span>
      </div>
      <div className="nav-item">
        <FaUsers size={20} />
        <span>Местные</span>
      </div>
      <div className="nav-item">
        <FaCompass size={20} />
        <span>Навигатор</span>
      </div>
      <div className="nav-item">
        <FaUser size={20} />
        <span>Аккаунт</span>
      </div>
    </nav>
  );
}
