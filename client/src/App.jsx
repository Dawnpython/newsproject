import { useEffect, useState } from "react";
import Preloader from "./pages/preloader/Preloader.jsx";
import Userpage from "./pages/userpage/Userpage.jsx";
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

  return ready ? <Userpage /> : <Preloader />;
}
