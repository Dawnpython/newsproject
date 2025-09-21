// App.jsx
import { useState, useEffect } from "react";
import Preloader from "./pages/preloader/Preloader.jsx";
import Userpage from './pages/userpage/Userpage.jsx'

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 25000);
    return () => clearTimeout(timer);
  }, []);

  return loading ? (
    <Preloader />
  ) : (
    <Userpage/>
  );
}

export default App;
