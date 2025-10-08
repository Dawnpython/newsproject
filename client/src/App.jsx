import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Preloader from "./pages/preloader/Preloader.jsx";
import Userpage from "./pages/userpage/Userpage.jsx";
import Login from "./pages/loginPage/Login.jsx";
import WelcomeAuth from "./pages/welcomeAuth/welcomeAuth.jsx";
import Userprofile from '/src/pages/userprofile/Userprofile.jsx'
import Application from "./pages/applications/Applications.jsx";
import Adminpage from '/src/pages/adminpage/Admin.jsx'
import { IMAGES_TO_PRELOAD } from "/src/utils/Imagestack.jsx";
import { preloadImages } from "/src/utils/usePreloadImages.jsx";

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    preloadImages(IMAGES_TO_PRELOAD, 3000).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <Router>
      {ready ? (
        <Routes>
          <Route path="/" element={<Userpage />} />
          <Route path="/account" element={<WelcomeAuth />} />
             <Route path="/login" element={<Login />} />
             <Route path="/profile" element={<Userprofile/>} />
             <Route path="/application" element={<Application/>} />
             <Route path="/admin" element={<Adminpage/>} />
        </Routes>
      ) : (
        <Preloader />
      )}
    </Router>
  );
}