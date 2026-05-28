/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  CacheFirst,
  StaleWhileRevalidate,
  NetworkFirst,
  ExpirationPlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: ({ request }) => request.destination === "image",
      handler: new CacheFirst({
        cacheName: "s4a-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 7 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new StaleWhileRevalidate({
        cacheName: "s4a-api",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 5 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "s4a-pages",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
