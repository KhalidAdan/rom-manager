import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import { Link } from "@remix-run/react";
import { Search } from "lucide-react";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
  gradient: string;
  image: string;
  count: number;
}

interface Rom {
  id: string;
  title: string;
  image: string;
  category: string;
}

const categories: Category[] = [
  {
    id: "action",
    name: "Action",
    gradient: "from-red-500 to-orange-500",
    image: "/placeholder.svg?height=200&width=300",
    count: 150,
  },
  {
    id: "rpg",
    name: "RPG",
    gradient: "from-blue-500 to-purple-500",
    image: "/placeholder.svg?height=200&width=300",
    count: 200,
  },
  {
    id: "platformer",
    name: "Platformer",
    gradient: "from-green-500 to-teal-500",
    image: "/placeholder.svg?height=200&width=300",
    count: 100,
  },
  {
    id: "strategy",
    name: "Strategy",
    gradient: "from-yellow-500 to-amber-500",
    image: "/placeholder.svg?height=200&width=300",
    count: 80,
  },
  {
    id: "simulation",
    name: "Simulation",
    gradient: "from-indigo-500 to-cyan-500",
    image: "/placeholder.svg?height=200&width=300",
    count: 60,
  },
  {
    id: "puzzle",
    name: "Puzzle",
    gradient: "from-pink-500 to-rose-500",
    image: "/placeholder.svg?height=200&width=300",
    count: 120,
  },
];

const roms: Rom[] = [
  {
    id: "1",
    title: "Super Metroid",
    image: "/placeholder.svg?height=300&width=200",
    category: "action",
  },
  {
    id: "2",
    title: "Chrono Trigger",
    image: "/placeholder.svg?height=300&width=200",
    category: "rpg",
  },
  {
    id: "3",
    title: "Super Mario World",
    image: "/placeholder.svg?height=300&width=200",
    category: "platformer",
  },
  {
    id: "4",
    title: "The Legend of Zelda: A Link to the Past",
    image: "/placeholder.svg?height=300&width=200",
    category: "action",
  },
  {
    id: "5",
    title: "Final Fantasy VI",
    image: "/placeholder.svg?height=300&width=200",
    category: "rpg",
  },
  {
    id: "6",
    title: "Mega Man X",
    image: "/placeholder.svg?height=300&width=200",
    category: "action",
  },
  {
    id: "7",
    title: "Castlevania: Symphony of the Night",
    image: "/placeholder.svg?height=300&width=200",
    category: "action",
  },
  {
    id: "8",
    title: "Super Metroid",
    image: "/placeholder.svg?height=300&width=200",
    category: "action",
  },
];

export default function CategoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const category = categories[0]; // For this example, we'll use the first category (Action)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with search */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{category.name} ROMs</h1>
          <div className="relative w-64">
            <Input
              type="search"
              placeholder="Search ROMs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 text-white border-gray-700"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* All ROMs Carousel */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            All {category.name} ROMs
          </h2>
          <Carousel className="w-full">
            <CarouselContent>
              {roms.map((rom) => (
                <CarouselItem
                  key={rom.id}
                  className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <div className="p-1">
                    <Card className="bg-gray-800 overflow-hidden">
                      <CardContent className="p-0 aspect-[3/4] relative group">
                        <img
                          src={rom.image}
                          alt={rom.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {rom.title}
                            </h3>
                            <Badge variant="secondary">{rom.category}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>

        {/* Category Stats */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">
            {category.name} Category Stats
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{category.count}</p>
              <p className="text-sm text-gray-400">Total ROMs</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">18</p>
              <p className="text-sm text-gray-400">New This Week</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">5,234</p>
              <p className="text-sm text-gray-400">Total Downloads</p>
            </div>
          </div>
        </div>

        {/* All Categories */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">All Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link to={`/category/${cat.id}`} key={cat.id}>
                <Card
                  className={`bg-gradient-to-br ${cat.gradient} overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-105`}
                >
                  <CardContent className="p-0 aspect-video relative">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover mix-blend-overlay"
                    />
                    <div className="absolute inset-0 flex flex-col justify-end p-4">
                      <h3 className="text-2xl font-bold">{cat.name}</h3>
                      <p className="text-sm">{cat.count} ROMs</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
