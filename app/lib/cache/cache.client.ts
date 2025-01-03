import localforage from "localforage";
import type { Params } from "react-router";
import type { GameDetails, GameLibrary } from "../game-library";
import type { GenreInfo } from "../genre-library";

interface WithClientCacheOptions<T, S extends StoreKey> {
  store: S;
  cacheKey: string | ((params: Params<string>) => string);
  ttl: number;
  serverLoader: () => Promise<any>;
  params: Params<string>;
}

export interface CachedData<T> {
  data: T;
  timestamp: number;
  eTag: string;
}

const STORE_CONFIG = {
  gameLibrary: {
    name: "gameLibrary",
    type: "games-cache",
    description: "Cached game library data",
  },
  genreInfo: {
    name: "genreInfo",
    type: "genres-cache",
    description: "Cached genre information",
  },
  detailedInfo: {
    name: "detailedInfo",
    type: "details-cache",
    description: "Cached detailed game information",
  },
} as const;

export type StoreKey = keyof typeof STORE_CONFIG;

const stores = Object.fromEntries(
  Object.entries(STORE_CONFIG).map(([key, config]) => [
    key,
    localforage.createInstance({
      ...config,
      driver: localforage.INDEXEDDB,
    }),
  ])
) as { [K in StoreKey]: LocalForage };

interface CacheStore<T> {
  get: (key: string) => Promise<CachedData<T> | null>;
  set: (key: string, data: CachedData<T>) => Promise<void>;
  clear: () => Promise<void>;
  clearKey: (key: string) => Promise<void>;
}

const cacheManager = {
  gameLibrary: createStore<GameLibrary>("gameLibrary"),
  genreInfo: createStore<GenreInfo>("genreInfo"),
  detailedInfo: createStore<GameDetails>("detailedInfo"),
  clearAll: async () => {
    await Promise.all(Object.values(stores).map((store) => store.clear()));
  },
};

function createStore<T>(storeName: StoreKey): CacheStore<T> {
  return {
    async get(key: string) {
      try {
        return await stores[storeName].getItem(key);
      } catch (error) {
        console.error(`Failed to get from ${storeName} cache:`, error);
        return null;
      }
    },
    async set(key: string, data: CachedData<T>) {
      try {
        await stores[storeName].setItem<CachedData<T>>(key, {
          data: data.data,
          timestamp: Date.now(),
          eTag: data.eTag,
        });
      } catch (error) {
        console.error(`Failed to set ${storeName} cache:`, error);
      }
    },
    async clear() {
      try {
        await stores[storeName].clear();
      } catch (error) {
        console.error(`Failed to clear ${storeName} cache:`, error);
      }
    },
    async clearKey(key: string) {
      try {
        await stores[storeName].removeItem(key);
      } catch (error) {
        console.error(
          `Failed to clear key ${key} from ${storeName} cache:`,
          error
        );
      }
    },
  };
}

export const getCacheManager = () => cacheManager;

/**
 * Client-side cache implementation for Remix loaders
 *
 * Strategy:
 * 1. Return cached data if within TTL
 * 2. On cache expiry, validate ETag
 * 3. If ETag matches, update timestamp and return cached data
 * 4. If ETag differs, fetch fresh data from server
 *
 * Note: Client TTL is roughly 25% of server TTL, but configurable
 * Note: The store is the specific indexedDB database, cacheKey is the KV key
 */
export async function withClientCache<T, S extends StoreKey>({
  store,
  cacheKey,
  ttl,
  serverLoader,
  params,
}: WithClientCacheOptions<T, S>) {
  try {
    let key = typeof cacheKey === "function" ? cacheKey(params) : cacheKey;
    let cached = await cacheManager[store].get(key);

    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    try {
      let freshData = await serverLoader();

      await cacheManager[store].set(key, {
        data: freshData,
        timestamp: Date.now(),
        eTag: freshData.eTag,
      });

      return freshData;
    } catch (error) {
      if (error instanceof Response && error.status === 304 && cached) {
        await cacheManager[store].set(key, {
          data: { ...cached } as any,
          timestamp: Date.now(),
          eTag: cached.eTag,
        });
        return cached;
      }
      throw error;
    }
  } catch (error) {
    console.error("Cache error:", error);
    return serverLoader();
  }
}
