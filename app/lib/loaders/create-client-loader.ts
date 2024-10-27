import type { ClientLoaderFunctionArgs } from "@remix-run/react";
import type { CachedData } from "../cache/cache.client";
import { CACHE_TTL } from "../const";

export function createClientLoader<T>({
  getCacheKey,
  getCache,
  setCache,
}: {
  getCacheKey: (params: any) => string;
  getCache: (key: string) => Promise<CachedData<T> | null>;
  setCache: (key: string, data: T) => Promise<void>;
}) {
  return async function clientLoader({
    serverLoader,
    params,
  }: ClientLoaderFunctionArgs) {
    try {
      const cacheKey = getCacheKey(params);
      const cached = await getCache(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }

      const data = (await serverLoader()) as unknown as T;
      await setCache(cacheKey, data);
      return data;
    } catch (error) {
      return serverLoader();
    }
  };
}
