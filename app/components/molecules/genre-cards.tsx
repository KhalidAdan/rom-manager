import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useResponsiveSlideScroll } from "@/hooks/use-responsive-slide-scroll";
import { cn } from "@/lib/utils";
import { Link } from "@remix-run/react";

interface Category {
  id: string;
  name: string;
  gradient: string;
  coverArt: string;
  image: string;
}

const gradients = [
  "from-green-600 to-blue-600 from-5% to-95%",
  "from-purple-600 to-pink-600 from-5% to-95%",
  "from-yellow-600 to-orange-600 from-5% to-95%",
  "from-blue-600 to-indigo-600 from-5% to-95%",
  "from-green-600 to-teal-600 from-5% to-95%",
  "from-orange-600 to-red-600 from-5% to-95%",
  "from-blue-600 to-purple-600 from-5% to-95%",
  "from-pink-600 to-teal-600 from-5% to-95%",
  "from-teal-600 to-purple-600 from-5% to-95%",
];

export function GenreCards({ genres }: { genres: Category[] }) {
  let slidesToScroll = useResponsiveSlideScroll();
  return (
    <div className="w-full px-14">
      <h2 className="text-2xl font-semibold mb-4">Categories for You</h2>
      <Carousel
        className="w-full"
        opts={{
          align: "start",
          loop: true,
          skipSnaps: true,
          slidesToScroll,
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {genres.map((genre, i) => (
            <CarouselItem
              key={genre.id}
              className="group md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
            >
              <Link to={`/genre/${genre.id}`}>
                <Card className="w-full h-[200px] cursor-pointer overflow-hidden">
                  <CardContent className="p-0 relative h-full">
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-90",
                        gradients[i % gradients.length]
                      )}
                    ></div>
                    <img
                      src={
                        genre.coverArt
                          ? `data:image/jpeg;base64,${genre.coverArt}`
                          : "https://placehold.co/600x600"
                      }
                      alt={genre.name}
                      className="grayscale opacity-40 absolute inset-0 w-full h-full object-cover mix-blend-overlay transition-transform duration-200 ease-in-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-end p-4">
                      <h3 className="text-white text-xl font-bold drop-shadow-lg">
                        {genre.name}
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
