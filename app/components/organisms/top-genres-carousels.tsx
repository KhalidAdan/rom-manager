import { GameCard } from "../molecules/game-card";
import { GenericCarousel } from "../molecules/game-carousel";

interface Game {
  title: string;
  coverArt: string;
  system: {
    title: string;
  };
}

interface Genre {
  name: string;
  gameGenres: Game[];
}

export type TopGenresCarouselType = Genre[];

let shuffle = <T,>(arr: T[]): T[] =>
  arr
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

export function TopGenresCarousel({
  genres,
}: {
  genres: TopGenresCarouselType;
}) {
  return (
    <div className="space-y-12 px-14 mt-12">
      {genres.map((genre) => (
        <div key={genre.name} className="space-y-4">
          <h2 className="text-2xl font-semibold">{genre.name}</h2>
          <GenericCarousel<Game>
            items={shuffle(genre.gameGenres)}
            renderItem={(game) => (
              <GameCard
                title={game.title}
                coverArt={game.coverArt}
                systemTitle={game.system.title}
              />
            )}
          />
        </div>
      ))}
    </div>
  );
}
