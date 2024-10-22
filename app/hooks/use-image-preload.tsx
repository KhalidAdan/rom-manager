import { useEffect } from "react";

export function useImagePreload(
  images: { base64: string | null; priority: number }[]
) {
  useEffect(() => {
    const prioritizedImages = images
      .filter((img) => img.base64)
      .sort((a, b) => a.priority - b.priority);

    const imagesToPreload = prioritizedImages.slice(0, 3);

    imagesToPreload.forEach(({ base64 }) => {
      if (base64) {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${base64}`;
      }
    });
  }, [images]);
}
