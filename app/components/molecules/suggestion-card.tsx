import { Genre } from "@prisma/client";
import { Link } from "react-router";
import { Card, CardContent } from "../atoms/card";

export function SuggestionCard({
  id,
  name,
  image,
}: {
  id: Genre["id"];
  name: Genre["name"];
  image?: string;
}) {
  return (
    <Link to={`/genre/${id}`}>
      <Card className="overflow-hidden border-none hover:border-solid rounded-none group">
        <CardContent className="p-0">
          <div className="relative aspect-[2/1]">
            <img
              src={
                image
                  ? `data:image/jpeg;base64,${image}`
                  : "https://placehold.co/400x250"
              }
              alt={`An image depicting one of your top games in the ${name} genre`}
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
