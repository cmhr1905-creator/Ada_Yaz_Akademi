/* Ada'nın Yaz Akademisi — Service Worker
   Çevrimdışı çalışma için app shell önbelleği (cache-first).
   Sürüm değişince eski önbellek temizlenir.
   NOT: Tek bir dosya (ör. eksik bir ikon) 404 dönse bile kurulum
   ÇÖKMEZ — her dosya ayrı ayrı, hataya toleranslı önbelleğe alınır. */
const CACHE = "ada-akademi-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon.png"
];

// Kurulum: kabuğu önbelleğe al (dosya bazlı, hataya toleranslı)
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        ASSETS.map((url) =>
          fetch(url)
            .then((res) => (res.ok ? c.put(url, res) : null))
            .catch(() => null)
        )
      )
    )
  );
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

// İstekler: önce ağ dene (her zaman en güncel index.html için), olmazsa önbellek
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const istekURL = new URL(e.request.url);
  const sayfaIstegi = e.request.mode === "navigate" || istekURL.pathname.endsWith("index.html") || istekURL.pathname.endsWith("/");
  if (sayfaIstegi) {
    // HTML için: ağ öncelikli (network-first) — güncelleme hep hemen görünsün
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Diğer dosyalar (ikon/manifest) için: önce önbellek, yoksa ağ
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
