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
    <div className="px-4 sm:px-8 lg:px-16 xl:px-20 2xl:max-w-[1900px] 2xl:mx-auto">
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
