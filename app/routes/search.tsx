import {
  GameCard,
  GameCardSkeleton,
} from "@/components/molecules/generic-game-card";
import { SuggestionCard } from "@/components/molecules/suggestion-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollBar } from "@/components/ui/scroll-area";
import { requireUser } from "@/lib/auth/auth.server";
import { prisma } from "@/lib/prisma.server";
import { cn } from "@/lib/utils";
import { Game, System } from "@prisma/client";
import { getTopGenres } from "@prisma/client/sql";
import { ScrollArea } from "@radix-ui/react-scroll-area";
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
    coverArt: q.coverArt
      ? Buffer.from(q.coverArt).toString("base64")
      : undefined,
  }));
}

async function getTopFourGenres() {
  let topFiveGameGenres = await prisma.$queryRawTyped(getTopGenres(4));
  let genres = topFiveGameGenres.map((genre) => genre.name);

  let suggestions = await prisma.genre.findMany({
    select: {
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
    name: genre.name,
    coverArt: genre.gameGenres[0].game.coverArt
      ? Buffer.from(genre.gameGenres[0].game.coverArt).toString("base64")
      : undefined,
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

let completions = ["Adventure", "Tactical", "RPG"];

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
          src="/boy-playing-retro-games.webp"
          alt="Background"
          className="w-screen h-screen object-cover"
        />
        <div className="absolute inset-0 bg-black opacity-75"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black max-h-screen" />
        <div className="absolute inset-0 bg-gradient-to-t from-black from-10% via-black/10 to-transparent max-h-screen" />
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
            {initialData.suggestions.map((category, index) => (
              <SuggestionCard
                key={index}
                name={category.name}
                image={category.coverArt}
              />
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/4">
              <h2 className="text-xl font-semibold mb-4">Tags</h2>
              <ScrollArea className="md:h-[calc(100vh-200px)]">
                <ul>
                  {completions.map((completion, index) => (
                    <li
                      key={index}
                      className="py-2 px-3 hover:bg-accent/25 cursor-pointer rounded-lg"
                    >
                      {completion}
                    </li>
                  ))}
                </ul>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            <div className="w-full md:w-3/4">
              <h2 className="text-xl font-semibold mb-4">
                {results ? "Results" : ""}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-1">
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
