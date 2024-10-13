import React, { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";

type GenericCarouselProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemClassName?: string;
};

export function GenericCarousel<T>({
  items,
  renderItem,
  itemClassName,
}: GenericCarouselProps<T>) {
  let [slidesToScroll, setSlidesToScroll] = useState<number>(4);

  useEffect(() => {
    let handleResize = () => {
      if (window.matchMedia("(min-width: 1280px)").matches) {
        setSlidesToScroll(6);
      } else if (window.matchMedia("(min-width: 1024px)").matches) {
        setSlidesToScroll(5);
      } else if (window.matchMedia("(min-width: 768px)").matches) {
        setSlidesToScroll(4);
      } else if (window.matchMedia("(min-width: 640px)").matches) {
        setSlidesToScroll(3);
      } else {
        setSlidesToScroll(2);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
        skipSnaps: true,
        slidesToScroll: slidesToScroll ?? undefined,
      }}
      className="w-full select-none"
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {items.map((item, index) => (
          <CarouselItem
            key={index}
            className={
              itemClassName ||
              "basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
            }
          >
            {renderItem(item, index)}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious variant="ghost" className="h-12 w-12 rounded-none" />
      <CarouselNext variant="ghost" className="h-12 w-12 rounded-none" />
    </Carousel>
  );
}
