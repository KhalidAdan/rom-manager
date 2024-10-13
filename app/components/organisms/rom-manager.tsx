import { SUPPORTED_SYSTEMS_WITH_EXTENSIONS } from "@/lib/const";
import { Game } from "@prisma/client";
import { GenericCarousel } from "../molecules/generic-carousel";
import { GameCard } from "../molecules/generic-game-card";

export type RomType = {
  id: Game["id"];
  title: Game["title"];
  coverArt: string;
  system: (typeof SUPPORTED_SYSTEMS_WITH_EXTENSIONS)[number];
};

type RomManagerType = {
  games: RomType[];
};

export default function RomManager({ games }: RomManagerType) {
  return (
    <div className="min-h-screen px-14">
      <div className="space-y-2">
        {SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(({ title }) => (
          <div key={title}>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <GenericCarousel<RomType>
              items={games.filter((rom) => rom.system.title === title)}
              renderItem={(rom) => (
                <GameCard
                  id={rom.id}
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
