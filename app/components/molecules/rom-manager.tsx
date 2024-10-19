import { SUPPORTED_SYSTEMS_WITH_EXTENSIONS } from "@/lib/const";
import { Game, System } from "@prisma/client";
import { GameCard } from "./game-card";
import { GenericCarousel } from "./generic-carousel";

export type RomType = {
  id: Game["id"];
  title: Game["title"];
  coverArt: string;
  system: (typeof SUPPORTED_SYSTEMS_WITH_EXTENSIONS)[number];
};

type RomManagerType = {
  systemTitle: System["title"];
  games: RomType[];
};

export default function RomManager({ games, systemTitle }: RomManagerType) {
  return (
    <div className="mx-4 sm:mx-8 lg:mx-16">
      <h2 className="text-2xl font-semibold mb-2">{systemTitle}</h2>
      <GenericCarousel<RomType>
        items={games}
        renderItem={(rom) => (
          <GameCard
            id={rom.id}
            title={rom.title}
            coverArt={rom.coverArt}
            systemTitle={systemTitle}
          />
        )}
      />
    </div>
  );
}
