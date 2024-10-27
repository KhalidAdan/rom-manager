import { GenericCarousel } from "@/components/molecules/generic-carousel";
import { StaticGameCard } from "@/components/molecules/static-game-card";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/auth.server";
import { UserRoles } from "@/lib/auth/providers.server";
import { getGenreInfoCache, setGenreInfoCache } from "@/lib/cache/cache.client";
import {
  cache,
  generateETag,
  globalVersions,
  updateVersion,
} from "@/lib/cache/cache.server";
import { GENRE_CACHE_KEY } from "@/lib/const";
import { fetchGenreInfo, GenreInfo } from "@/lib/genre-library";
import { createClientLoader } from "@/lib/loaders/create-client-loader";
import { cn } from "@/lib/utils";
import cachified from "@epic-web/cachified";
import { json, LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

let HEADERS = {
  VERSION: "X-Genre-Version",
  CACHE_CONTROL: "Cache-Control",
  ETAG: "ETag",
} as const;

export async function loader({ request, params }: LoaderFunctionArgs) {
  let user = await requireUser(request);

  if (!user.signupVerifiedAt && user.roleId !== UserRoles.ADMIN)
    throw redirect(`/needs-permission`);

  let genreId = params.id;

  try {
    if (!genreId) throw new Error("genreId could not be pulled from URL");

    let genreInfo = await cachified({
      key: GENRE_CACHE_KEY(genreId),
      cache,
      async getFreshValue() {
        let info = await fetchGenreInfo(Number(genreId), user.id);

        return info;
      },
    });

    let version = globalVersions.genreInfo.toString();

    return json(
      {
        ...genreInfo,
        _meta: {
          version,
        },
      },
      {
        headers: {
          [HEADERS.CACHE_CONTROL]: "max-age=900, stale-while-revalidate=3600",
          [HEADERS.ETAG]: `"${generateETag(genreInfo)}"`,
          [HEADERS.VERSION]: globalVersions.genreInfo.toString(),
        },
      }
    );
  } catch (error) {
    updateVersion("genreInfo");
    return json(
      {
        error: `${error}`,
      },
      {
        headers: {
          [HEADERS.CACHE_CONTROL]: "no-cache",
          [HEADERS.VERSION]: globalVersions.genreInfo.toString(),
        },
      }
    );
  }
}

export const clientLoader = createClientLoader<GenreInfo>({
  getCacheKey: (params) => GENRE_CACHE_KEY(params.id),
  getCache: getGenreInfoCache,
  setCache: setGenreInfoCache,
});

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
