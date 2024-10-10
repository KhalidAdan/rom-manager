import { GameCard } from "../molecules/game-card";
import { GenericCarousel } from "../molecules/game-carousel";

export type TopGenresCarouselType = {
  games: {
    coverArt: string;
    title: string;
    system: {
      title: string;
    };
  }[];
  name: string;
}[];

export function TopGenresCarousel({
  genres,
}: {
  genres: TopGenresCarouselType;
}) {
  return (
    <div className="space-y-12 px-14">
      {genres.map((genre) => (
        <div key={genre.name} className="space-y-4">
          <h2 className="text-2xl font-semibold">{genre.name}</h2>
          <GenericCarousel
            items={genre.games}
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
