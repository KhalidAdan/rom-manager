import { Cache, CacheEntry, totalTtl } from "@epic-web/cachified";
import { remember } from "@epic-web/remember";
import crypto from "crypto";
import { LRUCache } from "lru-cache";

let lruCache = remember(
  "lruCache",
  () => new LRUCache<string, CacheEntry>({ max: 1000 })
);

interface GlobalVersions {
  genreInfo: number;
  gameLibrary: number;
  details: number;
}

export let globalVersions = remember("globalVersions", () => ({
  genreInfo: Date.now(),
  gameLibrary: Date.now(),
  details: Date.now(),
}));

export function updateVersion(key: keyof GlobalVersions) {
  globalVersions[key] = Date.now();
}

export function generateETag(data: any): string {
  let content = typeof data === "string" ? data : JSON.stringify(data);
  let hash = crypto.createHash("sha256").update(content).digest("hex");

  return hash;
}

export let cache: Cache & { clear: () => void } = {
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
  clear: () => {
    return lruCache.clear();
  },
};
