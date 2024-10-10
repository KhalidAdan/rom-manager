import { prettifyROMTitles } from "@/lib/const";
import { cn } from "@/lib/utils";
import { Link } from "@remix-run/react";

type GameCardProps = {
  title: string;
  coverArt: string;
  systemTitle: string;
};

export function GameCard({ title, coverArt, systemTitle }: GameCardProps) {
  return (
    <button
      className={cn(
        "aspect-[3/4] relative group cursor-pointer overflow-hidden rounded-lg"
      )}
      type="submit"
    >
      <Link
        to={`/details/${systemTitle.toLowerCase()}/${prettifyROMTitles(title)}`}
        prefetch="intent"
      >
        <img
          src={`data:image/jpeg;base64,${coverArt}`}
          width={300}
          height={400}
          alt={title}
          className="transition-transform duration-300 ease-in-out object-cover border group-hover:scale-110"
        />
        <div className="absolute inset-0 text-white bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-75 transition-opacity duration-300 p-4">
          <p className="absolute bottom-10 left-2 right-2 text-2xl font-medium text-center">
            {prettifyROMTitles(title)}
          </p>
        </div>
      </Link>
    </button>
  );
}
