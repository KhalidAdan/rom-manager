import localforage from "localforage";
import { GameDetails, GameLibrary } from "../game-library";
import { GenreInfo } from "../genre-library";

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
  set: (key: string, data: T) => Promise<void>;
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
    async set(key: string, data: T) {
      try {
        await stores[storeName].setItem<CachedData<T>>(key, {
          data,
          timestamp: Date.now(),
          eTag: "",
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
