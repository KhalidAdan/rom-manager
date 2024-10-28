import type { ClientLoaderFunctionArgs } from "@remix-run/react";
import type { CachedData } from "./cache/cache.client";

export function createClientLoader<T>({
  getCacheKey,
  getCache,
  setCache,
  CACHE_TTL,
}: {
  getCacheKey: (params: any) => string;
  getCache: (key: string) => Promise<CachedData<T> | null>;
  setCache: (key: string, data: T) => Promise<void>;
  CACHE_TTL: number;
}) {
  return async function clientLoader({
    serverLoader,
    params,
  }: ClientLoaderFunctionArgs) {
    try {
      let cacheKey = getCacheKey(params);
      let cached = await getCache(cacheKey);
      let isFresh = cached && Date.now() - cached.timestamp < CACHE_TTL;

      if (isFresh) {
        return cached!.data;
      }

      let data = (await serverLoader()) as unknown as T;
      await setCache(cacheKey, data);
      return data;
    } catch (error) {
      return serverLoader();
    }
  };
}
