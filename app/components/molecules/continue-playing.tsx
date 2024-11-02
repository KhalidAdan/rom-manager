import { Game, System } from "@prisma/client";
import { Link } from "@remix-run/react";
import { PlayCircle } from "lucide-react";
import { Badge } from "../atoms/badge";
import { buttonVariants } from "../atoms/button";

type ContinuePlayingProps = {
  lastPlayedGame: Pick<Game, "id" | "title" | "summary"> & {
    backgroundImage?: string | undefined;
    system: System["title"];
  };
  random: boolean;
};

let truncateText = (str: string, maxLength = 300) =>
  str.length > maxLength ? str.slice(0, maxLength) + `...` : str;

export function ContinuePlaying({
  lastPlayedGame: { id, title, system, summary, backgroundImage },
  random,
}: ContinuePlayingProps) {
  return (
    <div className="relative min-h-0 md:min-h-[500px] lg:min-h-[600px] xl:min-h-[700px] 2xl:min-h-[700px] 3xl:min-h-[900px] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          className="object-cover w-full h-full"
          src={
            backgroundImage
              ? `data:image/jpeg;base64,${backgroundImage}`
              : "https://placehold.co/1970x1080"
          }
          alt={title}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black from-1% via-black/10 to-black to-99%" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_max(80vw,30vh)_at_center,_var(--tw-gradient-stops))] from-transparent via-black/90 to-black" />
      </div>

      <div className="relative z-10 flex flex-col justify-end h-full p-4 sm:p-8 lg:p-16 xl:p-20 2xl:max-w-[1900px] 2xl:mx-auto">
        <div className="w-full lg:w-2/3 xl:w-1/2 dspace-y-4 md:space-y-6 mt-20">
          <h2 className="text-xl font-bold tracking-normal">
            {random
              ? "We picked this for you, give it a try!"
              : "Pick up where you left off!"}
          </h2>
          <h3 className="font-serif text-5xl sm:text-7xl 2xl:text-8xl 3xl:text-9xl">
            {title}
          </h3>
          <Badge variant="outline" className="rounded">
            {system}
          </Badge>
          <p className="text-lg">{summary && truncateText(summary)}</p>
          <div className="flex flex-wrap gap-4 mt-4">
            <Link
              to={`/play/${system}/${id}`}
              className={buttonVariants({ variant: "default", size: "lg" })}
            >
              <PlayCircle className="mr-2 h-6 w-6" /> Play
            </Link>
            <Link
              to={`/details/${system}/${id}`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              See details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
