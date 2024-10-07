import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RomDetailsProps {
  name: string;
  releaseDate: string;
  coverArt: string;
  backgroundImage: string;
  summary: string;
  genres: string[];
}

export default function RomDetails({
  name,
  releaseDate,
  coverArt,
  backgroundImage,
  summary,
  genres,
}: RomDetailsProps) {
  return (
    <div className="relative min-h-screen bg-gray-900 text-white overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={backgroundImage}
          alt="Background"
          className="opacity-30 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover Art */}
          <div className="flex-shrink-0">
            <img
              src={coverArt}
              alt={name}
              width={300}
              height={400}
              className="rounded-lg shadow-lg"
            />
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            <h1 className="text-4xl font-bold mb-2">{name}</h1>
            <p className="text-gray-400 mb-4">{releaseDate}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
            <p className="text-lg mb-6">{summary}</p>
            <div className="flex gap-4">
              <Button>Play Now</Button>
              <Button variant="outline">Add to Favorites</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
