// app/routes/emulator.tsx
import { ContinuePlaying } from "@/components/molecules/continue-playing";
import { DiscoveryQueue } from "@/components/molecules/discovery-queue";
import { CategoryCards } from "@/components/organisms/category-cards";
import RomManager, { RomType } from "@/components/organisms/rom-manager";
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
import { prisma } from "@/lib/prisma.server";
import { cn } from "@/lib/utils";
import { getRandomGame, getTopGenres } from "@prisma/client/sql";
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { Intent } from "./details.$system.$id";

async function getLastPlayedGame() {
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
    orderBy: {
      lastPlayedAt: "desc",
    },
  });
}

export async function loader({ request }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  try {
    let [settings, games, [randomGame], topFiveGenres] = await Promise.all([
      await prisma.settings.findFirstOrThrow(),
      await prisma.game.findMany({
        select: {
          id: true,
          title: true,
          coverArt: true,
          system: {
            select: {
              title: true,
            },
          },
        },
      }),
      await prisma.$queryRawTyped(getRandomGame()),
      await prisma.$queryRawTyped(getTopGenres(5)),
    ]);

    let discoveryQueue = await prisma.game.findMany({
      where: {
        OR: [
          {
            gameGenres: {
              some: {
                genreId: {
                  in: topFiveGenres.map((genre) => genre.id),
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        summary: true,
        coverArt: true,
        // TODO: scrape rating from IGDB
      },
      take: 3,
    });

    let lastPlayedGame: Awaited<ReturnType<typeof getLastPlayedGame>> =
      await getLastPlayedGame();

    if (lastPlayedGame == null) {
      lastPlayedGame = {
        game: {
          id: randomGame.id,
          title: randomGame.title,
          summary: randomGame.summary,
          backgroundImage: randomGame.backgroundImage,
          system: {
            title: randomGame.system_title,
          },
        },
      };
    }

    return json(
      {
        games: games.map((game) => {
          return {
            ...game,
            coverArt: game.coverArt
              ? Buffer.from(game.coverArt).toString("base64")
              : "",
          };
        }),
        lastPlayedGame: lastPlayedGame
          ? {
              id: lastPlayedGame.game.id,
              title: lastPlayedGame.game.title,
              summary: lastPlayedGame.game.summary,
              system: lastPlayedGame.game.system.title,
              backgroundImage: lastPlayedGame.game.backgroundImage
                ? Buffer.from(lastPlayedGame.game.backgroundImage).toString(
                    "base64"
                  )
                : undefined,
            }
          : undefined,
        randomGame,
        settings,
        discoveryQueue,
      },
      {
        headers: {
          "Cache-Control": "max-age=3600, public",
        },
      }
    );
  } catch (error: unknown) {
    console.error(error);
    return {
      error: `${error}`,
    };
  }
}

export default function Explore() {
  let data = useLoaderData<typeof loader>();
  if ("error" in data) return <div>Error occurred, {data.error}</div>;

  let { games, lastPlayedGame, randomGame, settings, discoveryQueue } = data;

  const fetcher = useFetcher({ key: "update-last-played-game" });

  return (
    <main className="bg-black">
      <div className="flex justify-between pt-10 px-16">
        <div className="w-full flex justify-between">
          <h1 className="text-2xl font-bold mb-4 tracking-tight font-mono italic">
            {"{"} ROMSTHO {"}"}
          </h1>
          <div className="flex gap-4">
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
                      to={`/play/${randomGame.system_title}/${randomGame.id}`}
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
              Search
            </Link>
          </div>
        </div>
      </div>
      <div className="space-y-8">
        <ContinuePlaying
          lastPlayedGame={lastPlayedGame ?? (randomGame as any)}
          random={lastPlayedGame == undefined}
        />
        <RomManager
          games={games.filter((rom) => rom.system.title === "GBA") as RomType[]}
          systemTitle={"GBA"}
        />
        {settings.showCategoryRecs && <CategoryCards />}
        <RomManager
          games={
            games.filter((rom) => rom.system.title === "SNES") as RomType[]
          }
          systemTitle={"SNES"}
        />
        {settings.showDiscovery && <DiscoveryQueue />}
        <RomManager
          games={games.filter((rom) => rom.system.title === "GBC") as RomType[]}
          systemTitle={"GBC"}
        />
      </div>
      <div className="max-w-7xl mx-auto py-14">
        <Link to="/settings">Settings</Link>
      </div>
    </main>
  );
}
