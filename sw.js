/* Cap — service worker
   shell : cache-first · données (data.enc.json) : network-first avec repli cache */
"use strict";

const SHELL_CACHE = "cap-shell-v2";
const DATA_CACHE = "cap-data-v1";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function (cache) { return cache.addAll(SHELL_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL_CACHE && k !== DATA_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("data.enc.json")) {
    // Données : réseau d'abord, cache en secours
    event.respondWith(
      fetch(event.request).then(function (resp) {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(DATA_CACHE).then(function (c) { c.put(event.request, copy); });
        }
        return resp;
      }).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Shell : cache d'abord, réseau en secours (et mise en cache au passage)
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (resp) {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(SHELL_CACHE).then(function (c) { c.put(event.request, copy); });
        }
        return resp;
      });
    })
  );
});
