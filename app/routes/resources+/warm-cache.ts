import { UserRoles } from "@/lib/auth/providers.server";
import {
  cache,
  generateETag,
  getGlobalVersion,
  updateGlobalVersion,
} from "@/lib/cache/cache.server";
import { CACHE_SWR, CACHE_TTL, EXPLORE_CACHE_KEY } from "@/lib/const";
import { getGameLibrary } from "@/lib/game-library";
import { prisma } from "@/lib/prisma.server";
import cachified from "@epic-web/cachified";
import { json } from "@remix-run/node";

export async function loader() {
  try {
    let data = await cachified({
      key: EXPLORE_CACHE_KEY,
      cache,
      async getFreshValue() {
        let user = await prisma.user.findFirstOrThrow({
          where: {
            roleId: UserRoles.ADMIN,
          },
        });
        return await getGameLibrary(user);
      },
      ttl: CACHE_TTL,
      swr: CACHE_SWR,
    });
    return json(data, {
      headers: {
        "Cache-Control": "max-age=900, stale-while-revalidate=3600",
        ETag: `"${generateETag(data)}"`,
        "X-Version": getGlobalVersion().toString(),
      },
    });
  } catch (error) {
    updateGlobalVersion();
    return json({
      error: `${error}`,
    });
  }
}
