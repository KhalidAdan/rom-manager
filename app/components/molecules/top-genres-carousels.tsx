import { GenericCarousel } from "../molecules/generic-carousel";
import { GameCard } from "./game-card";

interface Game {
  id: number;
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
            items={genre.gameGenres}
            renderItem={(game) => (
              <GameCard
                id={game.id}
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
