import { Params, type ClientLoaderFunctionArgs } from "@remix-run/react";
import { getCacheManager, StoreKey } from "./cache/cache.client";

interface ClientLoaderOptions<T, P extends Params<string> = Params<string>> {
  store: StoreKey;
  getCacheKey: (params: P) => string;
  ttl: number;
}

export function createClientLoader<
  T,
  P extends Params<string> = Params<string>
>({ store, getCacheKey, ttl }: ClientLoaderOptions<T, P>) {
  return async function clientLoader({
    serverLoader,
    params,
    request,
  }: ClientLoaderFunctionArgs) {
    let cacheManager = getCacheManager();
    try {
      let cacheKey = getCacheKey(params as P);
      let cached = await cacheManager[store].get(cacheKey);

      if (cached) {
        let age = Date.now() - cached.timestamp;
        let isExpired = age >= ttl;
        let isNearExpiry = age >= ttl * 0.7;

        if (!isExpired) {
          if (isNearExpiry && cached.eTag) {
            const versionCheck = await fetch(request.url, {
              method: "HEAD",
              headers: {
                "If-None-Match": cached.eTag,
              },
            });

            if (versionCheck.status === 304) {
              cacheManager[store].set(cacheKey, cached.data as any);
              return cached.data;
            }
          }

          return cached.data;
        }
      }

      let freshData = await serverLoader();
      await cacheManager[store].set(cacheKey, freshData as any);
      return freshData;
    } catch (error) {
      return serverLoader();
    }
  };
}
