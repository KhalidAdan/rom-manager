import { cn } from "@/lib/utils";
import { Game, System } from "@prisma/client";
import { Link } from "@remix-run/react";
import { ChevronRight, Star } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "../ui/button";
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

interface DGame extends Game {
  system: System;
}

const IGDB_RATIO = 20; // igdb is on a 100 scale

function StarRating({ rating }: { rating: number }) {
  let adjustedRating = rating / IGDB_RATIO;
  return (
    <div className="flex items-center mt-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${
            star <= adjustedRating
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {adjustedRating.toFixed(1)}
      </span>
    </div>
  );
}

export function DiscoveryQueue({ games }: { games: DGame[] }) {
  let [open, setOpen] = useState(false);

  return (
    <div className="w-full space-y-4 mt-12">
      <Card className="bg-gradient-to-r from-blue-900 to-teal-700 overflow-hidden">
        <CardContent className="p-0 max-w-5xl mx-auto flex items-center justify-between min-h-[250px]">
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
                  {games.map((game) => (
                    <CarouselItem key={game.id}>
                      <div className="grid grid-cols-3">
                        <div className="h-full ">
                          <img
                            src={
                              game.coverArt
                                ? `data:image/jpeg;base64,${game.coverArt}`
                                : "https://placehold.co/400x600"
                            }
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
                            {game.rating && <StarRating rating={game.rating} />}
                          </div>
                          <div className="flex space-x-4">
                            <Link
                              to={`/details/${game.system.title}/${game.id}`}
                              className={cn(buttonVariants(), "w-1/2")}
                            >
                              View Game
                            </Link>
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
