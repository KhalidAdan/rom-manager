import { useEffect, useRef, useState } from "react";

interface OptimizedBase64ImageProps {
  base64: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function OptimizedBase64Image({
  base64,
  alt,
  className = "",
  width,
  height,
  priority = false,
}: OptimizedBase64ImageProps) {
  const [shouldLoad, setShouldLoad] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imageRef.current || priority) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "50px",
        threshold: 0.01,
      }
    );

    observer.observe(imageRef.current);
    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  if (!base64) {
    return (
      <div
        className={`bg-muted/40 animate-pulse ${className}`}
        style={{ width, height }}
        aria-label={alt}
        role="img"
      />
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-muted/40 animate-pulse"
          aria-hidden="true"
        />
      )}
      <img
        ref={imageRef}
        src={shouldLoad ? base64 : undefined}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        className={`
          transition-opacity duration-300 ease-in-out
          ${isLoaded ? "opacity-100" : "opacity-0"}
          ${className}
        `}
        loading={priority ? "eager" : "lazy"}
      />
    </div>
  );
}
