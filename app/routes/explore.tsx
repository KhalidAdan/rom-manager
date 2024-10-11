// app/routes/emulator.tsx
import { ContinuePlaying } from "@/components/molecules/continue-playing";
import RomManager, { RomManagerType } from "@/components/organisms/rom-manager";
import {
  TopGenresCarousel,
  TopGenresCarouselType,
} from "@/components/organisms/top-genres-carousels";
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
import { getRandomGame } from "@prisma/client/sql";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { Intent } from "./details.$system.$title";

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);

  try {
    let games = await prisma.game.findMany({
      select: {
        title: true,
        coverArt: true,
        system: {
          select: {
            title: true,
          },
        },
      },
    });

    let [randomGame] = await prisma.$queryRawTyped(getRandomGame());

    let topFiveGameGenres = await prisma.genre.groupBy({
      by: ["name"],
      _count: {
        name: true,
      },
      orderBy: {
        _count: {
          name: "desc",
        },
      },
      take: 5,
    });

    let gamesByGenre = await prisma.genre.findMany({
      select: {
        name: true,
        games: {
          select: {
            title: true,
            coverArt: true,
            system: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      where: {
        name: {
          in: topFiveGameGenres.map((genre) => genre.name),
        },
      },
      take: 5,
      orderBy: {
        games: {
          _count: "desc",
        },
      },
    });

    let lastPlayedGame = await prisma.gameStats.findFirst({
      select: {
        game: {
          select: {
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

    return {
      games: games.map((game) => {
        return {
          ...game,
          coverArt: game.coverArt
            ? Buffer.from(game.coverArt).toString("base64")
            : "",
        };
      }),
      gamesByGenre: gamesByGenre.map((genre) => ({
        ...genre,
        games: genre.games.map((game) => {
          return {
            ...game,
            coverArt: game.coverArt
              ? Buffer.from(game.coverArt).toString("base64")
              : "",
          };
        }),
      })),
      lastPlayedGame: lastPlayedGame
        ? {
            randomGame: randomGame,
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
    };
  } catch (error: unknown) {
    console.error("Error reading directory:", error);
    return {
      error: "Failed to read directory",
    };
  }
}

export default function Explore() {
  let data = useLoaderData<typeof loader>();
  if ("error" in data) return <div>Error occurred</div>;

  let { games, gamesByGenre, lastPlayedGame, randomGame } = data;

  const fetcher = useFetcher({ key: "update-last-played-game" });

  return (
    <main className="bg-background">
      <div className="flex justify-between pt-10 px-14">
        <div className="w-full flex justify-between">
          <h1 className="text-4xl font-light mb-4 tracking-tight font-mono italic">
            ROMSTHO
          </h1>
          {games.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="link" className="font-mono italic">
                  Backlog paralysis?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Can&apos;t figure out what to play?</DialogTitle>
                </DialogHeader>
                <div>
                  <DialogDescription>
                    You&apos;ve built up quite the library here, trust your
                    taste and just play something! The button below will choose
                    one at random!
                  </DialogDescription>
                </div>
                <DialogFooter>
                  <Link
                    to={`/play/${randomGame.system_title}/${randomGame.title}`}
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
        </div>
      </div>
      {lastPlayedGame && <ContinuePlaying lastPlayedGame={lastPlayedGame} />}
      <RomManager games={games as RomManagerType["games"]} />
      <TopGenresCarousel genres={gamesByGenre as TopGenresCarouselType} />
    </main>
  );
}
