import localforage from "localforage";
import { GameLibrary } from "../game-library";

export interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

export type CachedGameLibrary = CachedData<GameLibrary> & { authHash: string };

export let gameLibraryStore = localforage.createInstance({
  name: "gameLibrary",
  driver: localforage.LOCALSTORAGE,
  storeName: "cache",
  description: "Cached game library data",
});

export async function getGameLibraryCache(
  key: string
): Promise<CachedGameLibrary | null> {
  try {
    return await gameLibraryStore.getItem(key);
  } catch (error) {
    console.error("Failed to get from cache:", error);
    return null;
  }
}

export async function setGameLibraryCache(
  key: string,
  data: any,
  version: string,
  authHash: string
): Promise<void> {
  try {
    await gameLibraryStore.setItem(key, {
      data,
      timestamp: Date.now(),
      version,
      authHash,
    });
  } catch (error) {
    console.error("Failed to set cache:", error);
  }
}
