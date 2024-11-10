import { buttonVariants } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { GenericCarousel } from "@/components/molecules/generic-carousel";
import { StaticGameCard } from "@/components/molecules/static-game-card";
import { requireUser } from "@/lib/auth/auth.server";
import { withClientCache } from "@/lib/cache/cache.client";
import { cache, withCache } from "@/lib/cache/cache.server";
import { CLIENT_CACHE_TTL, GENRE_CACHE_KEY } from "@/lib/const";
import { GenreInfo, getGenreInfo } from "@/lib/genre-library";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/utils.server";
import { json, LoaderFunctionArgs, redirect } from "@remix-run/node";
import {
  ClientLoaderFunctionArgs,
  Link,
  useLoaderData,
} from "@remix-run/react";

export async function loader({ request, params }: LoaderFunctionArgs) {
  let user = await requireUser(request);

  let genreId = params.id;
  if (!genreId) throw new Error("genreId could not be pulled from URL");

  if (!hasPermission(user, { requireVerified: true })) {
    throw redirect("/needs-permission");
  }
  let ifNoneMatch = request.headers.get("If-None-Match");

  try {
    let { data, eTag, headers } = await withCache<GenreInfo>({
      key: GENRE_CACHE_KEY(genreId),
      cache,
      versionKey: "genreInfo",
      getFreshValue: async () => await getGenreInfo(Number(genreId), user.id),
    });

    if (ifNoneMatch === eTag) {
      // json() does not support 304 responses
      throw new Response(null, {
        status: 304,
        headers,
      });
    }

    return json(
      { ...data, eTag },
      {
        status: 200,
        headers,
      }
    );
  } catch (throwable) {
    if (throwable instanceof Response && throwable.status === 304) {
      return throwable as unknown as ReturnType<Awaited<typeof getGenreInfo>>; // this is the response to the HEAD request in the loader
    }
    return json(
      { error: `${throwable}` },
      { headers: { "Cache-Control": "no-cache" } }
    );
  }
}

export async function clientLoader({
  params,
  serverLoader,
}: ClientLoaderFunctionArgs) {
  return withClientCache({
    store: "genreInfo",
    cacheKey: (params) => {
      let genreId = params.id;
      if (!genreId) throw new Error("genreId could not be pulled from URL");
      return GENRE_CACHE_KEY(genreId);
    },
    ttl: CLIENT_CACHE_TTL,
    serverLoader,
    params,
  });
}

export default function GenrePage() {
  let data = useLoaderData<typeof loader>();
  if ("error" in data) return <div>Error occurred, {data && data.error}</div>;

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
