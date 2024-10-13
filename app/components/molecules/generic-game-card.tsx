import { cn } from "@/lib/utils";
import { Link } from "@remix-run/react";

type GameCardType = {
  id: number;
  title: string;
  coverArt?: string;
  systemTitle: string;
};

export function GameCard({ id, title, coverArt, systemTitle }: GameCardType) {
  return (
    <button
      className={cn(
        "aspect-[3/4] relative  cursor-pointer overflow-hidden group"
      )}
      type="submit"
      disabled
    >
      <Link
        to={`/details/${systemTitle.toLowerCase()}/${id}`}
        prefetch="intent"
      >
        <img
          src={
            coverArt
              ? `data:image/jpeg;base64,${coverArt}`
              : "https://placehold.co/400x600"
          }
          width={300}
          height={400}
          alt={title}
          className="transition-transform duration-300 ease-in-out object-cover group-hover:scale-110 h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-90 transition-opacity duration-300 p-4">
          <p className="absolute bottom-10 left-2 right-2 text-2xl font-medium text-center">
            {title}
          </p>
        </div>
      </Link>
    </button>
  );
}

export function GameCardSkeleton() {
  return (
    <div
      className={cn(
        "aspect-[3/4] relative overflow-hidden bg-accent/25 animate-pulse"
      )}
    >
      <div className="w-full h-full bg-accent" />
    </div>
  );
}
