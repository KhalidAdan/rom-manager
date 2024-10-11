import { SUPPORTED_SYSTEMS_WITH_EXTENSIONS } from "@/lib/const";
import { Game } from "@prisma/client";
import { GameCard } from "../molecules/game-card";
import { GenericCarousel } from "../molecules/game-carousel";

export type RomManagerType = {
  games: {
    title: Game["title"];
    coverArt: string;
    system: (typeof SUPPORTED_SYSTEMS_WITH_EXTENSIONS)[number];
  }[];
};

export default function RomManager({ games }: RomManagerType) {
  return (
    <div className="min-h-screen px-14">
      <div className="space-y-12">
        {SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(({ title }) => (
          <div key={title} className="space-y-4">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <GenericCarousel
              items={games.filter((rom) => rom.system.title === title)}
              renderItem={(rom) => (
                <GameCard
                  title={rom.title}
                  coverArt={rom.coverArt}
                  systemTitle={title}
                />
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
