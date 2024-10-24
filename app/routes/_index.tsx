import { buttonVariants } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { getUser } from "@/lib/auth/auth.server";
import { cn } from "@/lib/utils";
import { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

export async function loader({ request }: LoaderFunctionArgs) {
  return getUser(request);
}

export default function Home() {
  let data = useLoaderData<typeof loader>();
  return (
    <main className="bg-black">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 700 700"
        width="700"
        height="700"
        id="nnnoise"
        opacity="0.13"
        className="absolute top-0 left-0 h-full w-full z-10 pointer-events-none"
      >
        <defs>
          <filter
            id="nnnoise-filter"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            filterUnits="objectBoundingBox"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="linearRGB"
          >
            <feTurbulence
              type="turbulence"
              baseFrequency="0.2"
              numOctaves="4"
              seed="15"
              stitchTiles="stitch"
              x="0%"
              y="0%"
              width="100%"
              height="100%"
              result="turbulence"
            ></feTurbulence>
            <feSpecularLighting
              surfaceScale="15"
              specularConstant="0.75"
              specularExponent="20"
              lightingColor="#ffffff"
              x="0%"
              y="0%"
              width="100%"
              height="100%"
              in="turbulence"
              result="specularLighting"
            >
              <feDistantLight azimuth="3" elevation="100"></feDistantLight>
            </feSpecularLighting>
          </filter>
        </defs>
        <rect width="700" height="700" fill="transparent"></rect>
        <rect
          width="700"
          height="700"
          fill="#ffffff"
          filter="url(#nnnoise-filter)"
        ></rect>
      </svg>
      <div className={`relative w-full h-screen bg-black font-serif`}>
        <header className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-24 mt-10">
          <h2 className="text-2xl font-light tracking-tight font-mono italic">
            ROMSTHO
          </h2>
          <Link
            preventScrollReset
            to={!data.user ? "/authenticate" : "/auth/logout"}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "tracking-tight font-mono italic"
            )}
          >
            {!data.user ? "Login" : "Logout"}
          </Link>
        </header>
        <div className="absolute inset-0">
          <img
            src="/boy-playing-retro-games.webp"
            alt="Nostalgic gaming scene with a young boy playing a retro console"
            className="absolute right-0 h-full w-full object-cover object-right"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/80 to-black" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/10 to-transparent" />
        </div>
        <div className="relative z-10 flex flex-col pt-72 h-full text-white px-8 md:px-16 lg:px-24">
          <div className="max-w-xl space-y-4">
            <h1 className="text-5xl md:text-7xl leading-tight mb-10">
              Games used to make you feel things
            </h1>
            <p className="text-xl mb-2 font-sans-serif">
              Some still exist where all they ask is that you explore the land
              and save the realm. You just need to remember them.
            </p>
            <p className="text-xl !mb-8 font-sans-serif">
              Share the magic of those adventures. Let others feel the joy of
              discovery, where every moment holds a memory and every game
              invites you to escape.
            </p>
            <Link to="/explore">
              <RainbowButton className="text-xl font-semibold mt-4">
                Reconnect with the past
              </RainbowButton>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
