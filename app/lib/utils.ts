import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export let shuffle = <T>(arr: T[]): T[] =>
  arr
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

export function generateSrcSet(
  imageId: string,
  format: "webp" | "avif" | "jpeg"
) {
  const widths = [320, 640, 960, 1280];
  return widths
    .map((w) => `/image/${imageId}?width=${w}&format=${format} ${w}w`)
    .join(", ");
}
