/* Trendslator — service worker minimal (réseau direct) pour critères d’installation PWA */
self.addEventListener("install", function () {
    self.skipWaiting();
});

self.addEventListener("activate", function (event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
    event.respondWith(fetch(event.request));
});
