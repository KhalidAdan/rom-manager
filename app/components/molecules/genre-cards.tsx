import { Card, CardContent } from "@/components/atoms/card";
import { cn } from "@/lib/utils";
import { Link } from "react-router";
import { GenericCarousel } from "./generic-carousel";

interface Category {
  id: number;
  name: string;
  coverArt: string | undefined;
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
  return (
    <div className=" px-4 sm:px-8 lg:px-16 xl:px-20 2xl:max-w-[1900px] 2xl:mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Categories for You</h2>
      <GenericCarousel
        items={genres}
        renderItem={(genre: Category, index: number) => (
          <Link
            to={`/genre/${genre.id}`}
            className="group block w-full h-full"
            prefetch="viewport"
          >
            <Card className="w-full h-[200px] cursor-pointer overflow-hidden">
              <CardContent className="p-0 relative h-full">
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-90",
                    gradients[index % gradients.length]
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
        )}
        carouselClassName="w-full"
        carouselContentClassName="-ml-2 md:-ml-4"
        carouselItemClassName="basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 pl-0"
        prevButtonClassName="h-12 w-12 rounded-none"
        nextButtonClassName="h-12 w-12 rounded-none"
        useAdaptiveSlidesToScroll={true}
      />
    </div>
  );
}
