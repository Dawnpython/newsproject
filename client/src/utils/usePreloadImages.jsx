export function preloadImages(urls = [], minDelayMs = 2000) {
  const wait = new Promise((r) => setTimeout(r, minDelayMs));
  const preload = Promise.all(
    urls.map(
      (src) =>
        new Promise((r) => {
          const img = new Image();
          img.onload = img.onerror = () => r();
          img.src = src;
        })
    )
  );
  return Promise.all([wait, preload]);
}
