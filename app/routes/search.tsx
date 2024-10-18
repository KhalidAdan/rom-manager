import { GameCard, GameCardSkeleton } from "@/components/molecules/game-card";
import { SuggestionCard } from "@/components/molecules/suggestion-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/auth.server";
import { bufferToStringIfExists } from "@/lib/fs.server";
import { prisma } from "@/lib/prisma.server";
import { cn } from "@/lib/utils";
import { Game, System } from "@prisma/client";
import { getTopGenres } from "@prisma/client/sql";
import { LoaderFunctionArgs } from "@remix-run/node";
import {
  Link,
  useFetcher,
  useLoaderData,
  useSearchParams,
} from "@remix-run/react";
import { useEffect, useRef, useState } from "react";

async function performSearch(query: string): Promise<
  {
    title: string;
    id: number;
    coverArt: string | undefined;
    systemTitle: string;
  }[]
> {
  let q = `"%${query.replace(/"/g, '""')}%"`;
  let data: {
    title: Game["title"];
    id: Game["id"];
    coverArt: Game["coverArt"];
    systemTitle: System["title"];
  }[] = await prisma.$queryRawUnsafe(
    `SELECT g.id, g.title, g.coverArt, s.title as systemTitle FROM games g INNER JOIN systems s ON g.system_id = s.id WHERE g.title LIKE ${q} OR systemTitle LIKE ${q};`
  );

  return data.map((q) => ({
    ...q,
    coverArt: bufferToStringIfExists(q.coverArt),
  }));
}

async function getTopFourGenres() {
  let topFourGameGenres = await prisma.$queryRawTyped(getTopGenres());
  let genres = topFourGameGenres.map((genre) => genre.name).slice(0, 4);

  let suggestions = await prisma.genre.findMany({
    select: {
      id: true,
      name: true,
      gameGenres: {
        select: {
          game: {
            select: {
              coverArt: true,
            },
          },
        },
      },
    },
    where: {
      name: {
        in: genres,
      },
    },
  });

  return suggestions.map((genre) => ({
    id: genre.id,
    name: genre.name,
    coverArt: bufferToStringIfExists(genre.gameGenres[0].game.coverArt),
  }));
}

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  let q = new URL(request.url).searchParams.get("q");

  return {
    query: q ? await performSearch(q) : [],
    suggestions: await getTopFourGenres(),
  };
}

export default function Search() {
  let initialData = useLoaderData<typeof loader>();
  let [results, setResults] = useState(initialData.query);
  let [searchParams, setSearchParams] = useSearchParams();
  let search = useFetcher<typeof loader>();
  let isInitialMount = useRef(true);
  let hasSearched = useRef(false);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      // This will run for all effects after the initial mount
      if (hasSearched.current && search.data && !Array.isArray(search.data))
        setResults(search.data.query ?? []);
    }
  }, [search.data, hasSearched.current]);
  return (
    <div className="min-h-screen relative bg-black">
      <div className="fixed inset-0 z-0">
        <img
          src="/boy-gameboy-recess.webp"
          alt="Background"
          className="w-screen h-screen object-cover"
        />
        <div className="absolute inset-0 bg-black opacity-75"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black min-h-screen -z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black from-10% via-black/10 to-transparent min-h-screen -z-10" />
      </div>

      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="flex justify-between mb-14">
            <h1 className="text-2xl font-bold mb-4 tracking-tight font-mono italic">
              {"{"} ROMSTHO {"}"}
            </h1>
            <Link
              to="/explore"
              className={cn(
                buttonVariants({ variant: "link" }),
                "font-mono italic"
              )}
            >
              Explore
            </Link>
          </header>
          <search.Form method="get">
            <Input
              name="q"
              type="search"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder="Search for something to play!"
              autoComplete="off"
              onChange={(e) => {
                hasSearched.current = true;
                search.submit(e.currentTarget.form);
              }}
              className="w-full bg-accent"
            />
          </search.Form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
            {initialData.suggestions.map((genre, index) => (
              <SuggestionCard
                key={index}
                id={genre.id}
                name={genre.name}
                image={genre.coverArt}
              />
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full">
              <h2 className="text-xl font-semibold mb-4">
                {results ? "Results" : ""}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-1">
                {results && results.length > 0 ? (
                  results.map((rom) => (
                    <div
                      className={cn({
                        "animate-pulse":
                          search.state === "submitting" ||
                          search.state === "loading",
                      })}
                      key={rom.id}
                    >
                      <GameCard
                        id={rom.id}
                        title={rom.title}
                        coverArt={rom.coverArt ?? ""}
                        systemTitle={rom.systemTitle}
                      />
                    </div>
                  ))
                ) : search.state === "submitting" ||
                  search.state === "loading" ? (
                  <>
                    <GameCardSkeleton />
                    <GameCardSkeleton />
                    <GameCardSkeleton />
                    <GameCardSkeleton />
                  </>
                ) : (
                  <p>Nothing to see here!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
