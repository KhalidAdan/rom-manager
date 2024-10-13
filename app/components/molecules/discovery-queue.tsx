import { ChevronRight, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

interface Game {
  id: string;
  title: string;
  summary: string;
  coverArt: string;
  rating: number;
}

const mockGames: Game[] = [
  {
    id: "1",
    title: "Super Metroid",
    summary:
      "The third installment in the Metroid series, Super Metroid follows Samus Aran as she attempts to retrieve the last surviving Metroid from the Space Pirates.",
    coverArt: "https://placehold.co/400x600",
    rating: 4.8,
  },
  {
    id: "2",
    title: "Chrono Trigger",
    summary:
      "A role-playing video game that follows a group of adventurers who travel through time to prevent a global catastrophe.",
    coverArt: "https://placehold.co/400x600",
    rating: 4.9,
  },
  {
    id: "3",
    title: "Final Fantasy VI",
    summary:
      "Set in a fantasy world with technology resembling that of the Second Industrial Revolution, the game's story follows an expanding cast that includes fourteen permanent playable characters.",
    coverArt: "https://placehold.co/400x600",
    rating: 4.7,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center mt-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${
            star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-gray-600">{rating.toFixed(1)}</span>
    </div>
  );
}

export function DiscoveryQueue() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full space-y-4 mt-12">
      <Card className="x-20 w-full bg-gradient-to-r from-blue-900 to-purple-900 overflow-hidden">
        <CardContent className="p-0 max-w-5xl mx-auto flex items-center justify-between">
          <div className="p-6 space-y-2">
            <h2 className="text-4xl font-bold">Explore Your Queue</h2>
            <p className="text-xl">Discover new games tailored just for you</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="mr-6 group">
                Start Exploring
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl p-10 select-none">
              <DialogHeader>
                <DialogTitle>Your Discovery Queue</DialogTitle>
                <DialogDescription>
                  Here are some games we think you'll love. Use the arrows to
                  navigate through the queue.
                </DialogDescription>
              </DialogHeader>
              <Carousel className="w-full mt-4" opts={{ loop: true }}>
                <CarouselContent>
                  {mockGames.map((game) => (
                    <CarouselItem key={game.id}>
                      <div className="grid grid-cols-3">
                        <div className="h-full border-2 border-neutral-700 shadow-lg shadow-neutral-500 dark:border-neutral-400 dark:shadow-neutral-600">
                          <img
                            src={game.coverArt}
                            alt={game.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="col-span-2 px-6 pt-6 flex flex-col justify-between">
                          <div className="flex-grow">
                            <h3 className="text-2xl font-bold mb-2">
                              {game.title}
                            </h3>
                            <p>{game.summary}</p>
                            <StarRating rating={game.rating} />
                          </div>
                          <div className="flex space-x-4">
                            <Button className="w-1/2">View Game</Button>
                            <Button variant="outline" className="w-1/2">
                              Add to Favorites
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious
                  variant="ghost"
                  className="-left-24 h-12 w-12 rounded-none"
                />
                <CarouselNext
                  variant="ghost"
                  className="-right-24 h-12 w-12 rounded-none"
                />
              </Carousel>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
