import { Params } from "@remix-run/react";
import localforage from "localforage";
import { GameDetails, GameLibrary } from "../game-library";
import { GenreInfo } from "../genre-library";

interface WithClientCacheOptions<
  T,
  S extends StoreKey,
  P extends Params<string>
> {
  store: S;
  cacheKey: string | ((params: P) => string);
  ttl: number;
  serverLoader: () => Promise<T>;
  request: Request;
  params: P;
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
    description: "Cached genre info data",
  },
  detailedInfo: {
    name: "detailedInfo",
    type: "details-cache",
    description: "Cached details info data",
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

export type StoreData = {
  gameLibrary: CachedData<GameLibrary>;
  genreInfo: CachedData<GenreInfo>;
  detailedInfo: CachedData<GameDetails>;
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
          eTag: data.eTag || "",
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
 * Client-side cache implementation for Remix loaders that supports TTL and ETag validation.
 *
 * This cache works in conjunction with server-side caching to provide a two-level cache strategy:
 * 1. Local browser storage using IndexedDB
 * 2. Server-side validation using ETags
 *
 * The cache will:
 * - Return cached data if within TTL
 * - Validate fresh-but-unchanged data using ETags
 * - Automatically fetch fresh data when cache expires
 * - Fallback to server loader on any cache errors
 *
 * @param options Configuration options for the cache
 * @param options.store Which store to use (gameLibrary, genreInfo, detailedInfo)
 * @param options.cacheKey String or function to generate cache key
 * @param options.ttl Time-to-live in milliseconds
 * @param options.serverLoader Remix loader function to fetch fresh data
 * @param options.request Current request (needed for ETag validation)
 * @param options.params URL params (used for cache key generation)
 *
 * @returns Promise resolving to either cached or fresh data
 *
 * @example
 * export async function clientLoader({ request, params, serverLoader }: ClientLoaderFunctionArgs) {
 *   return withClientCache({
 *     store: 'gameLibrary',
 *     cacheKey: (params) => `games:${params.id}`,
 *     ttl: 5 * 60 * 1000, // 5 minutes
 *     serverLoader,
 *     request,
 *     params,
 *   });
 * }
 */
export async function withClientCache<
  T,
  S extends StoreKey,
  P extends Params<string>
>({
  store,
  cacheKey,
  ttl,
  serverLoader,
  request,
  params,
}: WithClientCacheOptions<T, S, P>) {
  try {
    let key = typeof cacheKey === "function" ? cacheKey(params) : cacheKey;

    let cached = await cacheManager[store].get(key);

    if (cached) {
      let age = Date.now() - cached.timestamp;
      let isExpired = age >= ttl;

      if (!isExpired && cached.eTag) {
        let versionCheck = await fetch(request.url, {
          method: "HEAD",
          headers: {
            "If-None-Match": cached.eTag,
          },
        });

        if (versionCheck.status === 304) {
          return cached.data;
        }
      }
    }

    let freshData = (await serverLoader()) as any;

    await cacheManager[store].set(key, {
      data: { ...freshData },
      timestamp: Date.now(),
      eTag: freshData.eTag,
    });

    return freshData;
  } catch {
    return serverLoader();
  }
}
