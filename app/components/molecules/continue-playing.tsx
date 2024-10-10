import { Game, System } from "@prisma/client";
import { Link } from "@remix-run/react";
import { PlayCircle } from "lucide-react";
import { buttonVariants } from "../ui/button";

type ContinuePlayingProps = {
  lastPlayedGame: Pick<Game, "title" | "summary"> & {
    backgroundImage?: string | undefined;
    system: System["title"];
  };
};

export function ContinuePlaying({
  lastPlayedGame: { title, system, summary, backgroundImage },
}: ContinuePlayingProps) {
  return (
    <div className="relative h-[70vh] w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-black/50 to-background" />
      <div className="absolute top-20 ml-8 p-8 w-full md:w-2/3 lg:w-1/2">
        <h2 className="text-2xl font-bold mb-2 tracking-normal">
          Pick up where you left off
        </h2>
        <h3 className="text-4xl font-bold mb-4 tracking-normal">
          {title} ({system})
        </h3>
        <p className="text-lg mb-6">{summary}</p>
        <div className="mt-4 flex gap-4">
          <Link
            to={`/play/${system}/${title}`}
            className={buttonVariants({ variant: "default", size: "lg" })}
          >
            <PlayCircle className="mr-2 h-6 w-6" /> Play
          </Link>
          <Link
            to={`/details/${system}/${title}`}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            See details
          </Link>
        </div>
      </div>
      <img
        src={
          backgroundImage
            ? `data:image/jpeg;base64,${backgroundImage}`
            : "https://placehold.co/1970x1080"
        }
        className="object-cover w-full h-full"
      />
    </div>
  );
}
