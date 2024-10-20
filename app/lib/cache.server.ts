import { Cache, CacheEntry, totalTtl } from "@epic-web/cachified";
import { remember } from "@epic-web/remember";
import crypto from "crypto";
import { LRUCache } from "lru-cache";

let lruCache = remember(
  "lruCache",
  () => new LRUCache<string, CacheEntry>({ max: 1000 })
);

let globalVersion = remember("globalVersion", () => ({
  value: Date.now(),
}));

export function updateGlobalVersion() {
  globalVersion.value = Date.now();
}

export function getGlobalVersion() {
  return globalVersion.value;
}

export function generateETag(data: any): string {
  let content = typeof data === "string" ? data : JSON.stringify(data);
  let hash = crypto.createHash("sha256").update(content).digest("hex");

  return hash;
}

export let cache: Cache = {
  set(key, value) {
    let ttl = totalTtl(value?.metadata);
    return lruCache.set(key, value, {
      ttl: ttl === Infinity ? undefined : ttl,
      start: value?.metadata?.createdTime,
    });
  },
  get(key) {
    return lruCache.get(key);
  },
  delete(key) {
    return lruCache.delete(key);
  },
};

export function generateCacheKey(userId: number, ...routeParts: string[]) {
  return `${userId}:${routeParts.join("/")}`;
}

export function bustCache(userId: number | null, ...routeParts: string[]) {
  let routePattern = routeParts.join("/");

  if (userId) {
    let key = generateCacheKey(userId, ...routeParts);
    cache.delete(key);
  } else {
    // If no userId provided, bust cache for all users matching the route pattern
    let keysToDelete = Array.from(lruCache.keys()).filter((key) =>
      key.includes(`:${routePattern}`)
    );
    keysToDelete.forEach((key) => cache.delete(key));
  }
}
