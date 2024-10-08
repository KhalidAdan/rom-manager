import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/auth.server";
import { prisma } from "@/lib/prisma.server";
import { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

type RomDetails = {
  name: string;
  releaseDate: string;
  coverArt: string;
  backgroundImage: string;
  summary: string;
  genres: string[];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUser(request);
  let game = await prisma.game.findFirst({
    where: {
      title: params.title,
    },
    select: {
      id: true,
      title: true,
      releaseDate: true,
      backgroundImage: true,
      file: true,
      summary: true,
      coverArt: true,
      system: {
        select: {
          id: true,
          title: true,
        },
      },
      genres: {
        select: {
          name: true,
        },
      },
    },
  });
  if (!game) throw new Error("Where the game at dog?");
  return game;
}

export default function RomDetails() {
  let {
    title,
    system,
    releaseDate,
    coverArt,
    backgroundImage,
    summary,
    genres,
  } = useLoaderData<typeof loader>();
  return (
    <div className="relative min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <img
          src={
            backgroundImage
              ? `http://${backgroundImage}`
              : "https://placehold.co/1920x1080"
          }
          alt="Background"
          className="opacity-40 object-cover h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover Art */}
          <div className="flex-shrink-0">
            <img
              src={
                coverArt ? `http://${coverArt}` : "https://placehold.co/600x400"
              }
              alt={title}
              className="rounded-lg shadow-lg"
            />
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            <div className="flex items-start justify-between">
              <h1 className="text-4xl font-bold mb-2">
                {title} <span className="uppercase">({system.title})</span>
              </h1>
              <Button variant="secondary">Edit metadata</Button>
            </div>
            <p className="text-gray-400 mb-4">{releaseDate}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {genres.map((genre, i) => (
                <Badge key={i}>{genre.name}</Badge>
              ))}
            </div>
            <p className="text-lg mb-6">{summary}</p>
            <div className="flex gap-4">
              <Button>Play Now</Button>
              <Button variant="secondary">Add to Favorites</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
