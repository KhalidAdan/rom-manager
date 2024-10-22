// app/routes/emulator.tsx
import { ContinuePlaying } from "@/components/molecules/continue-playing";
import { DiscoveryQueue } from "@/components/molecules/discovery-queue";
import { GenreCards } from "@/components/molecules/genre-cards";
import RomManager from "@/components/molecules/rom-manager";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requireUser } from "@/lib/auth/auth.server";
import {
  getGameLibraryCache,
  setGameLibraryCache,
} from "@/lib/cache/cache.client";
import {
  cache,
  generateETag,
  getGlobalVersion,
  updateGlobalVersion,
} from "@/lib/cache/cache.server";
import { CACHE_SWR, CACHE_TTL, EXPLORE_CACHE_KEY } from "@/lib/const";
import { getGameLibrary } from "@/lib/game-library";
import { cn } from "@/lib/utils";
import cachified from "@epic-web/cachified";
import { json, LoaderFunctionArgs } from "@remix-run/node";
import {
  ClientLoaderFunctionArgs,
  Link,
  useFetcher,
  useLoaderData,
} from "@remix-run/react";
import { Search } from "lucide-react";
import { Intent } from "./details.$system.$id";

export async function loader({ request }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  try {
    let data = await cachified({
      key: EXPLORE_CACHE_KEY,
      cache,
      async getFreshValue() {
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

export async function clientLoader({
  request,
  serverLoader,
}: ClientLoaderFunctionArgs) {
  try {
    let cached = await getGameLibraryCache(EXPLORE_CACHE_KEY);
    if (cached) {
      let serverVersion = request.headers.get("X-Version");
      let isVersionMatch = cached.version === serverVersion;
      let isFresh = Date.now() - cached.timestamp < CACHE_TTL;

      if (isVersionMatch && isFresh) return cached.data;
    }

    // cache invalidated or no cache
    let data = await serverLoader<typeof loader>();
    let version = request.headers.get("X-Version") as string;

    await setGameLibraryCache(EXPLORE_CACHE_KEY, data, version);

    return data;
  } catch (error) {
    console.error("Client loader error:", error);
    return serverLoader();
  }
}

export default function Explore() {
  let data = useLoaderData<typeof loader>();
  if ("error" in data) return <div>Error occurred, {data.error}</div>;

  let { games, lastPlayedGame, randomGame, settings, discoveryQueue, genres } =
    data;
  let fetcher = useFetcher({ key: "update-last-played-game" });

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
                            intent: Intent.UpdateLastPlayed,
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
              <Search className="h-4 w-4 mr-2" /> Search
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
          // @ts-expect-error
          games={games.filter((rom) => rom.system.title === "GBA")}
          systemTitle={"GBA"}
        />
        {settings.showCategoryRecs && (
          // @ts-expect-error
          <GenreCards genres={genres} />
        )}
        <RomManager
          // @ts-expect-error
          games={games.filter((rom) => rom.system.title === "SNES")}
          systemTitle={"SNES"}
        />
        {settings.showDiscovery && <DiscoveryQueue games={discoveryQueue} />}
        <RomManager
          // @ts-expect-error
          games={games.filter((rom) => rom.system.title === "GBC")}
          systemTitle={"GBC"}
        />
      </div>
    </main>
  );
}
