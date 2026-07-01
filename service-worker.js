/* Ada'nın Yaz Akademisi — Service Worker
   Çevrimdışı çalışma için app shell önbelleği (cache-first).
   Sürüm değişince eski önbellek temizlenir. */
const CACHE = "ada-akademi-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./curriculum.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon.png"
];

// Kurulum: tüm kabuğu önbelleğe al
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Etkinleşme: eski sürüm önbelleklerini sil
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// İstekler: önce önbellek, yoksa ağ (ve önbelleğe ekle)
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      return (
        cached ||
        fetch(e.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
            return res;
          })
          .catch(() => cached)
      );
    })
  );
});
