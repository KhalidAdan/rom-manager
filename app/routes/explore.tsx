import { Button, buttonVariants } from "@/components/atoms/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";
import { ContinuePlaying } from "@/components/molecules/continue-playing";
import { DiscoveryQueue } from "@/components/molecules/discovery-queue";
import { GenreCards } from "@/components/molecules/genre-cards";
import RomManager from "@/components/molecules/rom-manager";
import { requireUser } from "@/lib/auth/auth.server";
import { withClientCache } from "@/lib/cache/cache.client";
import { cache, withCache } from "@/lib/cache/cache.server";
import { CLIENT_CACHE_TTL, EXPLORE_CACHE_KEY } from "@/lib/const";
import { ErrorCode } from "@/lib/errors/codes";
import { ErrorFactory } from "@/lib/errors/factory";
import { getErrorDetails } from "@/lib/errors/helpers";
import { GameLibrary, getGameLibrary } from "@/lib/game-library";
import { DetailsIntent } from "@/lib/intents";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/utils.server";
import { SearchIcon } from "lucide-react";
import {
  ClientLoaderFunctionArgs,
  data as dataFn,
  Link,
  redirect,
  useFetcher,
  useLoaderData,
} from "react-router";
import type { Route } from "./+types/explore";

export async function loader({ request }: Route.LoaderArgs) {
  let user = await requireUser(request);

  if (!hasPermission(user, { requireVerified: true })) {
    throw redirect("/needs-permission");
  }
  let ifNoneMatch = request.headers.get("If-None-Match");

  try {
    let {
      data: cachedData,
      eTag,
      headers,
    } = await withCache<GameLibrary>({
      key: EXPLORE_CACHE_KEY,
      cache,
      versionKey: "gameLibrary",
      getFreshValue: async () => await getGameLibrary(user),
    });

    if (ifNoneMatch === eTag) {
      // json() does not support 304 responses
      throw new Response(null, {
        status: 304,
        headers,
      });
    }

    return dataFn(
      {
        ...(cachedData as unknown as Awaited<
          ReturnType<typeof getGameLibrary>
        >),
        eTag,
      },
      {
        status: 200,
        headers,
      }
    );
  } catch (throwable) {
    if (throwable instanceof Response && throwable.status === 304) {
      return throwable as unknown as ReturnType<Awaited<typeof getGameLibrary>>;
    }

    const { code, message, status, severity } = getErrorDetails(throwable);

    console.error("Game library loader error:", {
      code,
      message,
      status,
      severity,
    });

    return dataFn(
      {
        error: ErrorFactory.create(
          code as ErrorCode,
          message,
          { timestamp: new Date().toISOString() },
          { severity }
        ),
      },
      {
        headers: {
          "Cache-Control": "no-cache",
          "X-Error-Code": code,
          "X-Error-Severity": severity,
        },
      }
    );
  }
}

export async function clientLoader({
  params,
  serverLoader,
}: ClientLoaderFunctionArgs) {
  return withClientCache({
    store: "gameLibrary",
    cacheKey: EXPLORE_CACHE_KEY,
    ttl: CLIENT_CACHE_TTL,
    serverLoader,
    params,
  });
}

export default function Component({ loaderData }: Route.ComponentProps) {
  let fetcher = useFetcher({ key: "update-last-played-game" });
  let data = useLoaderData<typeof loader>();
  if ("error" in data) return <div>Error occurred, {data.error.message}</div>;

  let { games, lastPlayedGame, randomGame, settings, discoveryQueue, genres } =
    data;

  return (
    <main className="bg-black">
      <div className="pt-10 px-4 sm:px-8 lg:px-16 xl:px-20 2xl:max-w-[1900px] 2xl:mx-auto">
        <div className="w-full flex justify-between">
          <h1 className="text-2xl font-bold mb-4 tracking-tight font-mono italic text-nowrap text-center md:text-left w-full md:w-auto">
            {"{ ROMSTHO }"}
          </h1>
          <div className="hidden md:flex gap-4">
            {games.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" className="font-mono italic">
                    Backlog paralysis?
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Can&apos;t figure out what to play?
                    </DialogTitle>
                  </DialogHeader>
                  <div>
                    <DialogDescription>
                      You&apos;ve built up quite the library here, trust your
                      taste and just play something! The button below will
                      choose one at random!
                    </DialogDescription>
                  </div>
                  <DialogFooter>
                    <Link
                      to={`/play/${randomGame.system}/${randomGame.id}`}
                      className={cn(
                        buttonVariants({ variant: "default", size: "lg" }),
                        "border-2 border-foreground"
                      )}
                      onClick={() => {
                        fetcher.submit(
                          {
                            intent: DetailsIntent.UpdateLastPlayed,
                            gameId: randomGame.id,
                          },
                          { method: "POST" }
                        );
                      }}
                    >
                      Let us handle it
                    </Link>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Link
              to="/search"
              className={cn(
                buttonVariants({ variant: "link" }),
                "font-mono italic"
              )}
            >
              <SearchIcon className="h-4 w-4 mr-2" /> Search
            </Link>
            <Link
              to="/settings"
              className={cn(
                buttonVariants({ variant: "link" }),
                "font-mono italic"
              )}
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
      <div className="relative space-y-8 pb-20">
        <ContinuePlaying
          lastPlayedGame={lastPlayedGame ?? randomGame}
          random={lastPlayedGame == undefined}
        />
        <RomManager
          games={games.filter((rom) => rom.system.title === "GBA")}
          systemTitle={"GBA"}
        />
        {settings.showCategoryRecs && <GenreCards genres={genres} />}
        <RomManager
          games={games.filter((rom) => rom.system.title === "SNES")}
          systemTitle={"SNES"}
        />
        {settings.showDiscovery && <DiscoveryQueue games={discoveryQueue} />}
        <RomManager
          games={games.filter((rom) => rom.system.title === "GBC")}
          systemTitle={"GBC"}
        />
      </div>
    </main>
  );
}
