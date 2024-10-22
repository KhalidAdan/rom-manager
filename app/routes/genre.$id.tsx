import { GenericCarousel } from "@/components/molecules/generic-carousel";
import { StaticGameCard } from "@/components/molecules/static-game-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/auth.server";
import {
  cache,
  generateETag,
  getGlobalVersion,
  updateGlobalVersion,
} from "@/lib/cache/cache.server";
import { bufferToStringIfExists } from "@/lib/fs.server";
import { prisma } from "@/lib/prisma.server";
import { cn } from "@/lib/utils";
import cachified from "@epic-web/cachified";
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

async function fetchGenreInfo(genreId: string | undefined, userId: number) {
  if (!genreId) {
    throw new Response("Not Found", { status: 404 });
  }
  let activeGenre = await prisma.genre.findUnique({
    where: { id: Number(genreId) },
    include: {
      gameGenres: true,
    },
  });

  let allGenres = await prisma.genre.findMany({
    include: {
      _count: {
        select: { gameGenres: true },
      },
    },
  });

  let gamesInGenre = await prisma.game.findMany({
    where: {
      gameGenres: {
        some: {
          genreId: Number(genreId),
        },
      },
    },
    select: {
      id: true,
      title: true,
      summary: true,
      backgroundImage: true,
      coverArt: true,
      system: {
        select: {
          title: true,
        },
      },
    },
  });

  let gameStats = await prisma.gameStats.count({
    where: {
      userId: userId,
      game: {
        gameGenres: {
          some: {
            genreId: Number(genreId),
          },
        },
      },
    },
  });

  if (!activeGenre) {
    throw new Response("Genre Not Found", { status: 404 });
  }

  let gamesPlayedPercentage = Math.round(
    (gameStats / gamesInGenre.length) * 100
  );

  return {
    activeGenre,
    allGenres: allGenres
      .map((genre) => ({
        ...genre,
        gameCount: genre._count.gameGenres,
      }))
      .sort((a, b) => (a.gameCount < b.gameCount ? 1 : -1)),
    gamesInGenre: gamesInGenre.map((game) => ({
      ...game,
      coverArt: bufferToStringIfExists(game.coverArt),
      backgroundImage: bufferToStringIfExists(game.backgroundImage),
    })),
    gameStats,
    gamesPlayedPercentage,
  };
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  let genreId = params.id;

  try {
    if (!genreId) throw new Error("genreId could not be pulled from URL");

    let genreInfo = await cachified({
      key: `genre-${genreId}`,
      cache,
      async getFreshValue() {
        return await fetchGenreInfo(genreId, user.id);
      },
    });
    return json(genreInfo, {
      headers: {
        "Cache-Control": "max-age=900, stale-while-revalidate=3600",
        ETag: `"${generateETag(genreInfo)}"`,
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

export default function GenrePage() {
  let data = useLoaderData<typeof loader>();
  if ("error" in data) return <div>Error occurred, {data.error}</div>;

  let {
    activeGenre,
    allGenres,
    gamesInGenre,
    gameStats,
    gamesPlayedPercentage,
  } = data;

  return (
    <div className="min-h-screen relative mt-8">
      <header className="flex justify-between mb-14 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 tracking-tight font-mono italic">
          {"{"} ROMSTHO {"}"}
        </h1>
        <Link
          to="/explore"
          className={cn(
            buttonVariants({ variant: "link" }),
            "font-mono italic, z-10"
          )}
        >
          Explore
        </Link>
      </header>

      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed z-0 opacity-20"
        style={{
          backgroundImage: "url('/boy-games-before-school.webp')",
        }}
      >
        <div className="absolute inset-0 bg-black opacity-15"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black max-h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black from-10% via-black/10 to-transparent max-h-full" />
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">
              All {activeGenre.name} ROMs
            </h2>
            <GenericCarousel
              items={gamesInGenre}
              carouselClassName="w-full"
              useAdaptiveSlidesToScroll={true}
              renderItem={(game) => (
                <StaticGameCard
                  id={game.id}
                  title={game.title}
                  coverArt={game.coverArt}
                  systemTitle={game.system.title}
                />
              )}
            />
          </div>

          <div className="bg-black bg-opacity-80 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">
              {activeGenre.name} Category Stats
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{gamesInGenre.length}</p>
                <p className="text-sm text-gray-400">Total ROMs</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{gamesPlayedPercentage}%</p>
                <p className="text-sm text-gray-400">Games Played</p>
                <p className="text-xs text-gray-500 mt-1">
                  You've experienced {gameStats} out of {gamesInGenre.length}{" "}
                  {activeGenre.name} games!
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">All Categories</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {allGenres.map((genre) => (
                <Link to={`/genre/${genre.id}`} key={genre.id}>
                  <Card className="overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105">
                    <CardContent className="p-0 aspect-video relative">
                      <div className="absolute inset-0 flex flex-col justify-end p-4">
                        <h3 className="text-2xl font-bold">{genre.name}</h3>
                        <p className="text-sm">{genre.gameCount} ROMs</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
