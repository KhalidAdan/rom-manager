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
import { cache, generateCacheKey } from "@/lib/cache.server";
import { CACHE_SWR, CACHE_TTL } from "@/lib/const";
import { bufferToStringIfExists } from "@/lib/fs.server";
import { prisma } from "@/lib/prisma.server";
import { cn } from "@/lib/utils";
import cachified from "@epic-web/cachified";
import { User } from "@prisma/client";
import { getRandomGame, getTopGenres } from "@prisma/client/sql";
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { Search } from "lucide-react";
import { Intent } from "./details.$system.$id";

async function getLastPlayedGame(
  userId: number,
  filterIncompleteGame: boolean
) {
  let andFilter = [
    ...(filterIncompleteGame
      ? [
          {
            game: {
              backgroundImage: {
                not: null,
              },
            },
          },
        ]
      : []),
  ];
  return await prisma.gameStats.findFirst({
    select: {
      game: {
        select: {
          id: true,
          title: true,
          summary: true,
          backgroundImage: true,
          system: {
            select: {
              title: true,
            },
          },
        },
      },
    },
    where: {
      AND: [
        {
          userId,
        },
        ...andFilter,
      ],
    },
    orderBy: {
      lastPlayedAt: "desc",
    },
  });
}

function getDiscoveryQueue(games: any[], topGenres: any[]) {
  let topGenreIds = topGenres.map((genre) => genre.id);
  let filteredGames = games.filter((game) =>
    game.gameGenres.some((gg: any) => topGenreIds.includes(gg.genreId))
  );
  let shuffled = filteredGames.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}

async function fetchGameLibrary(user: User) {
  let settings = await prisma.settings.findFirstOrThrow();

  let [games, [randomGame], genres, lastPlayedGame] = await Promise.all([
    prisma.game.findMany({
      select: {
        id: true,
        title: true,
        coverArt: true,
        rating: true,
        summary: true,
        system: {
          select: {
            title: true,
          },
        },
        gameGenres: {
          select: {
            genreId: true,
          },
        },
      },
    }),
    prisma.$queryRawTyped(getRandomGame(settings.spotlightIncompleteGame)),
    prisma.$queryRawTyped(getTopGenres()),
    getLastPlayedGame(user.id, settings.spotlightIncompleteGame),
  ]);
  let topFiveGenres = genres.slice(0, 5);
  let discoveryQueue = getDiscoveryQueue(games, topFiveGenres);

  // Parallelize data transformations
  let [
    processedGames,
    processedDiscoveryQueue,
    processedGenres,
    processedRandomGame,
    processedLastPlayedGame,
  ] = await Promise.all([
    Promise.all(
      games.map((game) => ({
        ...game,
        coverArt: bufferToStringIfExists(game.coverArt),
      }))
    ),
    Promise.all(
      discoveryQueue.map((d) => ({
        ...d,
        coverArt: bufferToStringIfExists(d.coverArt),
      }))
    ),
    Promise.all(
      genres.map((genre) => ({
        ...genre,
        count: Number(genre.count),
        coverArt: bufferToStringIfExists(genre.coverArt),
      }))
    ),
    {
      ...randomGame,
      backgroundImage: bufferToStringIfExists(randomGame.backgroundImage),
    },
    lastPlayedGame
      ? {
          id: lastPlayedGame.game.id,
          title: lastPlayedGame.game.title,
          summary: lastPlayedGame.game.summary,
          system: lastPlayedGame.game.system.title,
          backgroundImage: bufferToStringIfExists(
            lastPlayedGame.game.backgroundImage
          ),
        }
      : undefined,
  ]);

  return {
    games: processedGames,
    lastPlayedGame: processedLastPlayedGame,
    randomGame: processedRandomGame,
    settings,
    discoveryQueue: processedDiscoveryQueue,
    genres: processedGenres,
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  try {
    let data = await cachified({
      key: generateCacheKey(user.id, "explore"),
      cache,
      async getFreshValue() {
        return await fetchGameLibrary(user);
      },
      ttl: CACHE_TTL,
      swr: CACHE_SWR,
    });
    return json(data);
  } catch (error) {
    return json({
      error: `${error}`,
    });
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
      <div className="pt-10 px-4 sm:px-8 lg:px-16">
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
