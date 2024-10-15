import { useEffect, useState } from "react";

export function useResponsiveSlideScroll() {
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

  return slidesToScroll;
}
