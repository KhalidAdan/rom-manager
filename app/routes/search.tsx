import { GameCard, GameCardSkeleton } from "@/components/molecules/game-card";
import { Input } from "@/components/ui/input";
import { ScrollBar } from "@/components/ui/scroll-area";
import { requireUser } from "@/lib/auth/auth.server";
import { prisma } from "@/lib/prisma.server";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useSearchParams } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  let q = new URL(request.url).searchParams.get("q");
  if (!q) return [];

  q = `"%${q.replace(/"/g, '""')}%"`;

  let query: any[] = await prisma.$queryRawUnsafe(
    `SELECT g.id, g.title, g.coverArt, s.title as systemTitle FROM games g INNER JOIN systems s ON g.system_id = s.id WHERE g.title LIKE ${q} OR systemTitle LIKE ${q};`
  );

  console.log("querying!", query);
  return query.map((q) => ({
    ...q,
    coverArt: q.coverArt
      ? Buffer.from(q.coverArt).toString("base64")
      : undefined,
  }));
}

let completions = ["Adventure", "Tactical", "RPG"];

export default function Search() {
  let initialData = useLoaderData<typeof loader>();
  let [results, setResults] = useState(initialData);
  let [searchParams, setSearchParams] = useSearchParams();
  let search =
    useFetcher<
      { id: number; title: string; coverArt: any; systemTitle: string }[]
    >();
  let isInitialMount = useRef(true);
  let hasSearched = useRef(false);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      // This will run for all effects after the initial mount
      hasSearched.current && setResults(search.data || []);
    }
  }, [search.data, hasSearched.current]);
  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      {/* Background Image with Dark Filter */}
      <div className="absolute inset-0 z-0">
        <img
          src="/boy-playing-retro-games.webp"
          alt="Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black opacity-75"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="mb-14">
            <h2 className="text-4xl font-light tracking-tight font-mono italic">
              ROMSTHO
            </h2>
          </header>
          <search.Form method="get">
            <Input
              name="q"
              type="search"
              defaultValue={searchParams.get("q") ?? ""}
              placeholder="Search for something to play!"
              onChange={(e) => {
                hasSearched.current = true;
                search.submit(e.currentTarget.form);
                let params = new URLSearchParams();
                params.set("q", e.target.value);
                setSearchParams(params, {
                  preventScrollReset: true,
                });
              }}
              className="w-full bg-accent"
            />
          </search.Form>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Text Completions */}
            <div className="w-full md:w-1/4">
              <h2 className="text-xl font-semibold mb-4">Suggestions</h2>
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

            {/* ROM Grid */}
            <div className="w-full md:w-3/4">
              <h2 className="text-xl font-semibold mb-4">
                {results ? "Results" : ""}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {results.length > 0 ? (
                  results.map((rom) => (
                    <div
                      className={cn("rounded-lg", {
                        "animate-pulse":
                          search.state === "submitting" ||
                          search.state === "loading",
                      })}
                      key={rom.id}
                    >
                      <GameCard
                        title={rom.title}
                        coverArt={rom.coverArt}
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black" />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/10 to-transparent" />
    </div>
  );
}
