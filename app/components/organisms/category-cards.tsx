import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { Link } from "@remix-run/react";

interface Category {
  id: string;
  name: string;
  gradient: string;
  image: string;
}

const categories: Category[] = [
  {
    id: "action",
    name: "Action",
    gradient: "from-green-400 to-blue-500 from-5% to-95%",
    image: "https://placehold.co/450x200",
  },
  {
    id: "rpg",
    name: "RPG",
    gradient: "from-purple-400 to-pink-500 from-5% to-95%",
    image: "https://placehold.co/450x200",
  },
  {
    id: "platformer",
    name: "Platformer",
    gradient: "from-yellow-400 to-red-500 from-5% to-95%",
    image: "https://placehold.co/450x200",
  },
  {
    id: "strategy",
    name: "Strategy",
    gradient: "from-blue-400 to-indigo-500 from-5% to-95%",
    image: "https://placehold.co/450x200",
  },
  {
    id: "simulation",
    name: "Simulation",
    gradient: "from-green-400 to-teal-500 from-5% to-95%",
    image: "https://placehold.co/450x200",
  },
];

export function CategoryCards() {
  return (
    <div className="w-full px-14">
      <h2 className="text-2xl font-semibold mb-4">Categories for You</h2>
      <Carousel
        className="w-full"
        opts={{
          align: "start",
          loop: true,
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {categories.map((category) => (
            <CarouselItem
              key={category.id}
              className="group md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
            >
              <Link to={`/category/${category.id}`}>
                <Card className="w-full h-[200px] cursor-pointer overflow-hidden">
                  <CardContent className="p-0 relative h-full">
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-70",
                        category.gradient
                      )}
                    ></div>
                    <img
                      src={category.image}
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover mix-blend-overlay transition-transform duration-200 ease-in-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-end p-4">
                      <h3 className="text-white text-xl font-bold drop-shadow-lg">
                        {category.name}
                      </h3>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious variant="ghost" className="h-12 w-12 rounded-none" />
        <CarouselNext variant="ghost" className="h-12 w-12 rounded-none" />
      </Carousel>
    </div>
  );
}
