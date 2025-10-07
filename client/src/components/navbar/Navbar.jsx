import { NavLink } from "react-router-dom";
import { FaHome, FaBell, FaComments, FaCompass, FaUser } from "react-icons/fa";
import '/src/components/navbar/Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <FaHome size={20} />
        <span>Главная</span>
      </NavLink>

      <NavLink to="/help" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <FaBell size={20} />
        <span>Помощь</span>
      </NavLink>

      <NavLink to="/application" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <FaComments size={20} />
        <span>Местные</span>
      </NavLink>

      <NavLink to="/navigator" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <FaCompass size={20} />
        <span>Навигатор</span>
      </NavLink>

      <NavLink to="/account" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
        <FaUser size={20} />
        <span>Аккаунт</span>
      </NavLink>
    </nav>
  );
}
