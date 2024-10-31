import cachified, { Cache, CacheEntry, totalTtl } from "@epic-web/cachified";
import { remember } from "@epic-web/remember";
import crypto from "crypto";
import { LRUCache } from "lru-cache";
import { CACHE_SWR, CACHE_TTL } from "../const";

export interface GlobalVersions {
  genreInfo: number;
  gameLibrary: number;
  detailedInfo: number;
}

interface WithCacheOptions<T> {
  key: string;
  ttl?: number;
  swr?: number;
  cache: CacheType;
  versionKey: keyof GlobalVersions;
  getFreshValue: () => T;
}

let lruCache = remember(
  "lruCache",
  () => new LRUCache<string, CacheEntry>({ max: 1000, ttlAutopurge: true })
);

export let globalVersions = remember("globalVersions", () => ({
  genreInfo: Date.now(),
  gameLibrary: Date.now(),
  detailedInfo: Date.now(),
}));

export function updateVersion(key: keyof GlobalVersions) {
  globalVersions[key] = Date.now();
}

export function generateETag(
  data: any,
  versionKey: keyof GlobalVersions
): string {
  let content = typeof data === "string" ? data : JSON.stringify(data);
  let versionedContent = `${content}-${globalVersions[versionKey]}`;
  let hash = crypto.createHash("sha256").update(versionedContent).digest("hex");

  return hash;
}

export type CacheType = Cache & { clear: () => void };

export let cache: CacheType = {
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

export async function withCache<T>({
  key,
  ttl = CACHE_TTL,
  swr = CACHE_SWR,
  cache,
  versionKey,
  getFreshValue,
}: WithCacheOptions<T>) {
  try {
    let data = await cachified({
      key,
      cache,
      ttl,
      swr,
      getFreshValue,
    });

    let eTag = `"${generateETag(data, versionKey)}"`;

    return {
      data,
      eTag,
      headers: {
        "Cache-Control": `max-age=${ttl}, stale-while-revalidate=${swr}`,
        ETag: eTag,
      },
    };
  } catch (error) {
    console.error(`Cache error for key ${key}:`, error);
    updateVersion(versionKey);
    throw error;
  }
}
