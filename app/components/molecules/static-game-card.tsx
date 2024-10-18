import { Link } from "@remix-run/react";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";

type StaticGameCardType = {
  id: number;
  title: string;
  coverArt?: string;
  systemTitle: string;
};

export function StaticGameCard({
  id,
  title,
  coverArt,
  systemTitle,
}: StaticGameCardType) {
  return (
    <Link to={`/details/${systemTitle}/${id}`} className="p-1">
      <Card className="bg-opacity-80 overflow-hidden">
        <CardContent className="p-0 aspect-[3/4] relative group">
          <img
            src={
              `data:image/jpeg;base64,${coverArt}` ||
              "/placeholder.svg?height=300&width=200"
            }
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
            <div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <Badge className="rounded">{systemTitle}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
