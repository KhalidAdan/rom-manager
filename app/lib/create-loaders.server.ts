import cachified from "@epic-web/cachified";
import { User } from "@prisma/client";
import { LoaderFunctionArgs } from "@remix-run/node";
import { json, Params, redirect } from "@remix-run/react";
import { requireUser } from "./auth/auth.server";
import { UserRoles } from "./auth/providers.server";
import {
  CacheType,
  generateETag,
  GlobalVersions,
  updateVersion,
} from "./cache/cache.server";
import { CACHE_SWR, CACHE_TTL } from "./const";

interface LoaderConfig<T, P extends Params<string> = Params<string>> {
  cacheKey: string | ((params: P) => string);
  getFreshValue: (context: {
    user: User;
    params: P;
    request: Request;
  }) => Promise<T>;
  cache: CacheType;
  permission?: {
    adminOnly?: boolean;
    requireVerified?: boolean;
    redirectTo?: string;
  };
  ttl?: number;
  swr?: number;
  versionKey: keyof GlobalVersions;
}

export function createLoader<T, P extends Params<string> = Params<string>>({
  cacheKey,
  getFreshValue,
  cache,
  permission = {
    requireVerified: true,
    redirectTo: "/needs-permission",
  },
  ttl = CACHE_TTL,
  swr = CACHE_SWR,
  versionKey,
}: LoaderConfig<T, P>) {
  return async function loader({ request, params }: LoaderFunctionArgs) {
    let user = await requireUser(request);

    if (
      (permission.requireVerified &&
        !user.signupVerifiedAt &&
        user.roleId !== UserRoles.ADMIN) ||
      (permission.adminOnly && user.roleId !== UserRoles.ADMIN)
    ) {
      throw redirect(permission.redirectTo ?? "/needs-permission");
    }

    try {
      let key =
        typeof cacheKey === "function" ? cacheKey(params as P) : cacheKey;

      let data = await cachified({
        key,
        cache,
        async getFreshValue() {
          return await getFreshValue({ user, params: params as P, request });
        },
        ttl,
        swr,
      });

      let eTag = `"${generateETag(data, versionKey)}"`;
      let ifNoneMatch = request.headers.get("If-None-Match");

      return json(ifNoneMatch === eTag ? null : data, {
        status: ifNoneMatch === eTag ? 304 : 200,
        headers: {
          "Cache-Control": "max-age=900, stale-while-revalidate=3600",
          ETag: eTag,
        },
      });
    } catch (error) {
      console.error(`Error in ${versionKey} loader:`, error);
      updateVersion(versionKey);

      return json(
        { error: `${error}` },
        { headers: { "Cache-Control": "no-cache" } }
      );
    }
  };
}
