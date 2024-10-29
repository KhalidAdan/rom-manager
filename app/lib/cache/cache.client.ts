import localforage from "localforage";
import { DETAILS_CACHE_KEY } from "../const";
import { GameDetails, GameLibrary } from "../game-library";
import { GenreInfo } from "../genre-library";

export interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

let STORES = {
  gameLibrary: {
    name: "gameLibrary",
    type: "games-cache" as const,
    description: "Cached game library data",
  },
  genreInfo: {
    name: "genreInfo",
    type: "genres-cache" as const,
    description: "Cached genre info data",
  },
  detailedInfo: {
    name: "detailedInfo",
    type: "details-cache" as const,
    description: "Cached details info data",
  },
} as const;

type StoreKey = keyof typeof STORES;
export type StoreData = {
  gameLibrary: CachedData<GameLibrary>;
  genreInfo: CachedData<GenreInfo>;
  detailedInfo: CachedData<GameDetails>;
};

let stores = Object.fromEntries(
  Object.entries(STORES).map(([key, config]) => [
    key,
    localforage.createInstance({
      ...config,
      driver: localforage.INDEXEDDB,
    }),
  ])
) as { [K in StoreKey]: LocalForage };

async function getCache<K extends StoreKey>(
  storeName: K,
  key: string
): Promise<StoreData[K] | null> {
  try {
    return await stores[storeName].getItem(key);
  } catch (error) {
    console.error(`Failed to get from ${storeName} cache:`, error);
    return null;
  }
}

async function setCache<K extends StoreKey>(
  storeName: K,
  key: string,
  data: StoreData[K]["data"]
): Promise<void> {
  try {
    await stores[storeName].setItem(key, {
      data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error(`Failed to set ${storeName} cache:`, error);
  }
}

export let getGameLibraryCache = (key: string) => getCache("gameLibrary", key);

export let getGenreInfoCache = (key: string) => getCache("genreInfo", key);

export let getDetailedInfoCache = (key: string) =>
  getCache("detailedInfo", key);

export let setGameLibraryCache = (key: string, data: GameLibrary) =>
  setCache("gameLibrary", key, data);

export let setGenreInfoCache = (key: string, data: GenreInfo) =>
  setCache("genreInfo", key, data);

export let setDetailedInfoCache = (key: string, data: GameDetails) =>
  setCache("detailedInfo", key, data);

export async function clearAllCaches() {
  await Promise.all(Object.values(stores).map((store) => store.clear()));
}

export function clearDetailedInfoCaches() {
  stores["detailedInfo"].clear();
}

export async function clearDetailedInfoCache(id: number) {
  await stores["detailedInfo"].removeItem(DETAILS_CACHE_KEY(id));
}

export async function debugStorageInfo() {
  for (let [name, store] of Object.entries(stores)) {
    try {
      let keys = await store.keys();
      let totalSize = await keys.reduce(async (accPromise, key) => {
        let acc = await accPromise;
        let value = await store.getItem(key);
        return acc + new Blob([JSON.stringify(value)]).size;
      }, Promise.resolve(0));

      console.log({
        store: name,
        driver:
          (await store.driver()) === localforage.INDEXEDDB
            ? "IndexedDB"
            : "other",
        size: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
        keys: keys.length,
      });
    } catch (error) {
      console.error(`Error checking ${name} storage:`, error);
    }
  }
}
