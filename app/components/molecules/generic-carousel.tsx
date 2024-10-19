import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useResponsiveSlideScroll } from "@/hooks/use-responsive-slide-scroll";
import { cn } from "@/lib/utils";
import React, { useMemo } from "react";

type GenericCarouselProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  carouselClassName?: string;
  carouselContentClassName?: string;
  carouselItemClassName?: string;
  prevButtonClassName?: string;
  nextButtonClassName?: string;
  useAdaptiveSlidesToScroll?: boolean;
};

const DEFAULT_ITEM_CLASS =
  "basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/5 xl:basis-1/6";

export function GenericCarousel<T>({
  items,
  renderItem,
  carouselClassName = "w-full",
  carouselContentClassName = "-ml-2 md:-ml-4",
  carouselItemClassName,
  prevButtonClassName = "h-12 w-12 rounded-none",
  nextButtonClassName = "h-12 w-12 rounded-none",
  useAdaptiveSlidesToScroll = true,
}: GenericCarouselProps<T>) {
  let breakpoints = useMemo(() => {
    let itemClassName = carouselItemClassName || DEFAULT_ITEM_CLASS;
    let classes = itemClassName.split(" ");
    return [
      {
        breakpoint: 1280,
        slidesToScroll:
          classes
            .find((c) => c.startsWith("xl:basis-"))
            ?.replace("xl:basis-1/", "") ?? "3",
      },
      {
        breakpoint: 1024,
        slidesToScroll:
          classes
            .find((c) => c.startsWith("lg:basis-"))
            ?.replace("lg:basis-1/", "") ?? "3",
      },
      {
        breakpoint: 768,
        slidesToScroll:
          classes
            .find((c) => c.startsWith("md:basis-"))
            ?.replace("md:basis-1/", "") ?? "3",
      },
      {
        breakpoint: 640,
        slidesToScroll:
          classes
            .find((c) => c.startsWith("sm:basis-"))
            ?.replace("sm:basis-1/", "") ?? "2",
      },
      {
        breakpoint: 0,
        slidesToScroll: "1",
      },
    ].map((b) => ({
      breakpoint: b.breakpoint,
      slidesToScroll: parseInt(b.slidesToScroll) ?? 1,
    }));
  }, [carouselItemClassName]);

  let slidesToScroll = useResponsiveSlideScroll(breakpoints);

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
              "basis-1/1 sm:basis-1/2 md:basis-1/3 lg:basis-1/5 xl:basis-1/6"
            }
          >
            {renderItem(item, index)}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        variant="ghost"
        className={cn(prevButtonClassName, "hidden lg:block")}
      />
      <CarouselNext
        variant="ghost"
        className={cn(nextButtonClassName, "hidden lg:block")}
      />
    </Carousel>
  );
}
