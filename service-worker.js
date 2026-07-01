/* Ada'nın Yaz Akademisi — Service Worker
   Çevrimdışı çalışma için app shell önbelleği.
   Sürüm değişince eski önbellek temizlenir.
   NOT: Tek bir dosya (ör. eksik bir ikon) 404 dönse bile kurulum
   ÇÖKMEZ — her dosya ayrı ayrı, hataya toleranslı önbelleğe alınır.
   ÖNEMLİ: Sadece BAŞARILI (200 OK) yanıtlar önbelleğe alınır — bir 404
   asla önbelleğe "yapışmaz", bir sonraki istekte tekrar denenir. */
const CACHE = "ada-akademi-v11";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon.png",
  "./ada-sahil.webp",
  "./ada-orman.webp",
  "./ada-tapinak.webp",
  "./ada-volkan.webp",
  "./ada-buz.webp",
  "./ada-hazine.webp",
  "./durum-tamam.webp",
  "./durum-bugun.webp",
  "./durum-kilitli.webp",
  "./harita-genel.webp"
];

// Kurulum: kabuğu önbelleğe al (dosya bazlı, hataya toleranslı, sadece 200 OK)
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(
        ASSETS.map((url) =>
          fetch(url, { cache: "no-store" })
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

// İstekler: önce ağ dene (her zaman en güncel içerik için), olmazsa önbellek
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const istekURL = new URL(e.request.url);
  const sayfaIstegi = e.request.mode === "navigate" || istekURL.pathname.endsWith("index.html") || istekURL.pathname.endsWith("/");
  if (sayfaIstegi) {
    // HTML için: ağ öncelikli (network-first) — güncelleme hep hemen görünsün
    e.respondWith(
      fetch(e.request, { cache: "no-store" })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Diğer dosyalar (görsel/ikon/manifest) için: önce önbellek, yoksa ağ — SADECE başarılı yanıt önbelleğe yazılır
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request, { cache: "no-store" })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); }
          return res;
        })
        .catch(() => cached);
    })
  );
});
