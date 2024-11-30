import { buttonVariants } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { GameCard, GameCardSkeleton } from "@/components/molecules/game-card";
import { SuggestionCard } from "@/components/molecules/suggestion-card";
import { requireUser } from "@/lib/auth/auth.server";
import { bufferToStringIfExists } from "@/lib/fs.server";
import { prisma } from "@/lib/prisma.server";
import { cn } from "@/lib/utils";
import { getTopGenres, searchGames } from "@prisma/client/sql";
import { LoaderFunctionArgs } from "react-router";
import { Link, useFetcher, useLoaderData, useSearchParams } from "react-router";
import { useCallback, useEffect, useState } from "react";

async function performSearch(query: string) {
  let searchTerm = `${query.replace(/"/g, '""')}`;
  let data = await prisma.$queryRawTyped(searchGames(searchTerm));

  return data.map((val) => ({
    ...val,
    coverArt: bufferToStringIfExists(val.coverArt),
  }));
}

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUser(request);
  let q = new URL(request.url).searchParams.get("q");

  let suggestions = await prisma.$queryRawTyped(getTopGenres());
  let query = q ? await performSearch(q) : [];

  return {
    query,
    suggestions: suggestions
      .map((genre) => ({
        id: genre.id,
        name: genre.name,
        coverArt: bufferToStringIfExists(genre.coverArt),
      }))
      .filter((_genre, i) => i <= 3),
  };
}

export default function Search() {
  let initialData = useLoaderData<typeof loader>();
  let [results, setResults] = useState(initialData.query);
  let [searchParams] = useSearchParams();
  let search = useFetcher<typeof loader>();
  let isLoading = search.state === "submitting" || search.state === "loading";

  useEffect(() => {
    if (!search.data) return;
    if (!Array.isArray(search.data)) {
      setResults(search.data.query);
    }
  }, [search.data]);

  let handleSearch = useCallback(
    (value: string) => {
      search.submit({ q: value }, { method: "get" });
    },
    [search]
  );

  return (
    <div className="min-h-screen relative bg-black">
      <SearchBackground />
      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <SearchHeader />
          <search.Form method="get">
            <SearchBar
              defaultValue={searchParams.get("q") ?? ""}
              onSearch={handleSearch}
            />
          </search.Form>

          <GenreSuggestions
            suggestions={initialData.suggestions as GenreSuggestions}
          />

          <div className="flex flex-col md:flex-row gap-6">
            <SearchResults
              results={results as SearchResults}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const SearchHeader = () => (
  <header className="flex justify-between mb-14">
    <h1 className="text-2xl font-bold mb-4 tracking-tight font-mono italic">
      {"{"} ROMSTHO {"}"}
    </h1>
    <Link
      to="/explore"
      className={cn(buttonVariants({ variant: "link" }), "font-mono italic")}
    >
      Explore
    </Link>
  </header>
);

const SearchBackground = () => (
  <div className="fixed inset-0 z-0">
    <img
      src="/boy-gameboy-recess.webp"
      alt="Background"
      className="w-screen h-screen object-cover"
    />
    <div className="absolute inset-0 bg-black opacity-75" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black min-h-screen -z-10" />
    <div className="absolute inset-0 bg-gradient-to-t from-black from-10% via-black/10 to-transparent min-h-screen -z-10" />
  </div>
);

const SearchBar = ({
  defaultValue,
  onSearch,
}: {
  defaultValue: string;
  onSearch: (searchValue: string) => void;
}) => {
  const [searchValue, setSearchValue] = useState(defaultValue || "");

  return (
    <Input
      name="q"
      type="search"
      defaultValue={searchValue}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onSearch(e.target.value)
      }
      placeholder="Search for something to play!"
      autoComplete="off"
      className="w-full bg-accent"
    />
  );
};

type GenreSuggestions = {
  id: number;
  name: string;
  coverArt: string | undefined;
}[];

const GenreSuggestions = ({
  suggestions,
}: {
  suggestions: GenreSuggestions;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
    {suggestions.map((genre) => (
      <SuggestionCard
        key={genre.id}
        id={genre.id}
        name={genre.name}
        image={genre.coverArt}
      />
    ))}
  </div>
);

type SearchResults = {
  coverArt: string | undefined;
  id: number;
  title: string;
  systemTitle: string;
}[];

const SearchResults = ({
  results,
  isLoading,
}: {
  results: SearchResults;
  isLoading: boolean;
}) => (
  <div className="w-full">
    {results && results.length > 0 && (
      <h2 className="text-xl font-semibold mb-4">Results</h2>
    )}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-1">
      {results && results.length > 0 ? (
        results.map((rom) => (
          <div className={cn({ "animate-pulse": isLoading })} key={rom.id}>
            <GameCard
              id={rom.id}
              title={rom.title}
              coverArt={rom.coverArt ?? ""}
              systemTitle={rom.systemTitle}
            />
          </div>
        ))
      ) : isLoading ? (
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
);
