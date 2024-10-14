import { Game, System } from "@prisma/client";
import { Link } from "@remix-run/react";
import { PlayCircle } from "lucide-react";
import { Badge } from "../ui/badge";
import { buttonVariants } from "../ui/button";

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
    <div className="relative h-[70vh] w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black from-1% via-black/10 to-black to-99%" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/90 to-black" />
      <div className="space-y-2 absolute top-20 ml-8 p-8 w-full md:w-2/3 lg:w-1/2">
        <h2 className="text-xl font-bold mb-2 tracking-normal">
          {random
            ? "We picked this for you, give it a try!"
            : "Pick up where you left off!"}
        </h2>
        <h3 className="font-serif text-7xl">{title}</h3>
        <Badge variant="outline" className="rounded">
          {system}
        </Badge>
        <p className="text-lg py-3">{summary && truncateText(summary)}</p>
        <div className="mt-4 flex gap-4">
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
