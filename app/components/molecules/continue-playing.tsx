import { PlayCircle } from "lucide-react";
import { Button } from "../ui/button";

export function ContinuePlaying() {
  return (
    <div className="relative h-[70vh] w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-black/50 to-background" />
      <div className="absolute top-20 ml-8 p-8 w-full md:w-2/3 lg:w-1/2">
        <h2 className="text-2xl font-bold mb-2 tracking-normal">
          Pick up where you left off
        </h2>
        <h3 className="text-4xl font-bold mb-4 tracking-normal">
          The Legend of Zelda: A Link to the Past (SNES)
        </h3>
        <p className="text-lg mb-6">
          Embark on an epic adventure to save Hyrule in this classic
          action-adventure game. Traverse between the Light and Dark Worlds,
          solve intricate puzzles, and defeat challenging bosses.
        </p>
        <div className="mt-4 flex gap-4">
          <Button size="lg">
            <PlayCircle className="mr-2 h-6 w-6" /> Play
          </Button>
          <Button size="lg" variant="outline">
            I&apos;m feeling lucky
          </Button>
        </div>
      </div>
      <img
        src={
          "https://www.nintendo.com/eu/media/images/10_share_images/games_15/super_nintendo_5/H2x1_SNES_TheLegendOfZeldaALinkToThePast.jpg"
        }
        className="object-cover"
      />
    </div>
  );
}
