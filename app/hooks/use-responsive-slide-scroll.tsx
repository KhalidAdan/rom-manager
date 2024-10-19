import { useEffect, useState } from "react";

type BreakpointConfig = {
  breakpoint: number;
  slidesToScroll: number;
};

export function useResponsiveSlideScroll(breakpoints: BreakpointConfig[]) {
  let [slidesToScroll, setSlidesToScroll] = useState<number>(1);

  useEffect(() => {
    let handleResize = () => {
      let windowWidth = window.innerWidth;
      let config =
        breakpoints.find((b) => windowWidth >= b.breakpoint) ||
        breakpoints[breakpoints.length - 1];
      setSlidesToScroll(config.slidesToScroll);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoints]);

  return slidesToScroll;
}
