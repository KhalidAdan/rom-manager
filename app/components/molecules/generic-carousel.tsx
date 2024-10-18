import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import React, { useEffect, useState } from "react";

type GenericCarouselProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemClassName?: string;
  carouselClassName?: string;
  carouselContentClassName?: string;
  carouselItemClassName?: string;
  prevButtonClassName?: string;
  nextButtonClassName?: string;
  useAdaptiveSlidesToScroll?: boolean;
};

export function GenericCarousel<T>({
  items,
  renderItem,
  itemClassName,
  carouselClassName = "w-full select-none",
  carouselContentClassName = "-ml-2 md:-ml-4",
  carouselItemClassName,
  prevButtonClassName = "h-12 w-12 rounded-none",
  nextButtonClassName = "h-12 w-12 rounded-none",
  useAdaptiveSlidesToScroll = true,
}: GenericCarouselProps<T>) {
  const [slidesToScroll, setSlidesToScroll] = useState<number>(4);

  useEffect(() => {
    if (useAdaptiveSlidesToScroll) {
      const handleResize = () => {
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
    }
  }, [useAdaptiveSlidesToScroll]);

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
        skipSnaps: true,
        slidesToScroll: useAdaptiveSlidesToScroll ? slidesToScroll : undefined,
      }}
      className={carouselClassName}
    >
      <CarouselContent className={carouselContentClassName}>
        {items.map((item, index) => (
          <CarouselItem
            key={index}
            className={
              carouselItemClassName ||
              itemClassName ||
              "basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
            }
          >
            {renderItem(item, index)}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious variant="ghost" className={prevButtonClassName} />
      <CarouselNext variant="ghost" className={nextButtonClassName} />
    </Carousel>
  );
}
