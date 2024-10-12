import React from "react";
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
  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent className="">
        {items.map((item, index) => (
          <CarouselItem
            key={index}
            className={
              itemClassName ||
              "basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
            }
          >
            {renderItem(item, index)}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
