import { Genre } from "@prisma/client";
import { Link } from "@remix-run/react";
import { Card, CardContent } from "../ui/card";

export function SuggestionCard({
  name,
  image,
}: {
  name: Genre["name"];
  image?: string;
}) {
  return (
    <Link to={`/tag/${name}`}>
      <Card className="overflow-hidden border-none group rounded-none">
        <CardContent className="p-0">
          <div className="relative aspect-[2/1]">
            <img
              src={
                `data:image/jpeg;base64,${image}` ??
                "https://placehold.co/400x250"
              }
              alt={name}
              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300 ease-in-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
            <h3 className="absolute bottom-2 left-2 text-lg font-semibold">
              {name}
            </h3>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
