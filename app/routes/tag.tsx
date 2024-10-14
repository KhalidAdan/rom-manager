import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "@remix-run/react";
import { useState } from "react";

interface Rom {
  id: string;
  title: string;
  coverArt: string;
  category: string;
}

interface Category {
  id: string;
  name: string;
}

const categories: Category[] = [
  { id: "action", name: "Action" },
  { id: "adventure", name: "Adventure" },
  { id: "rpg", name: "RPG" },
  { id: "strategy", name: "Strategy" },
  { id: "simulation", name: "Simulation" },
  { id: "sports", name: "Sports" },
  { id: "puzzle", name: "Puzzle" },
  { id: "platformer", name: "Platformer" },
  { id: "fighting", name: "Fighting" },
  { id: "racing", name: "Racing" },
];

const mockRoms: Rom[] = [
  {
    id: "1",
    title: "Super Metroid",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "action",
  },
  {
    id: "2",
    title: "The Legend of Zelda: A Link to the Past",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "action",
  },
  {
    id: "3",
    title: "Final Fantasy VI",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "rpg",
  },
  {
    id: "4",
    title: "Chrono Trigger",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "rpg",
  },
  {
    id: "5",
    title: "Super Mario World",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "platformer",
  },
  {
    id: "6",
    title: "Donkey Kong Country",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "platformer",
  },
  {
    id: "7",
    title: "Street Fighter II Turbo",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "fighting",
  },
  {
    id: "8",
    title: "Mega Man X",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "action",
  },
  {
    id: "9",
    title: "EarthBound",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "rpg",
  },
  {
    id: "10",
    title: "Super Mario Kart",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "racing",
  },
  {
    id: "11",
    title: "F-Zero",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "racing",
  },
  {
    id: "12",
    title: "Kirby Super Star",
    coverArt: "/placeholder.svg?height=300&width=200",
    category: "platformer",
  },
];

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("action");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredRoms = mockRoms.filter(
    (rom) =>
      rom.category === selectedCategory &&
      rom.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-6">
        <h1 className="text-2xl font-bold mb-6">ROM Manager</h1>
        <Input
          type="search"
          placeholder="Find ROMs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-6"
        />
        <h2 className="text-lg font-semibold mb-2">Categories</h2>
        <ScrollArea className="h-[calc(100vh-220px)]">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "ghost"}
              className="w-full justify-start mb-1"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </ScrollArea>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        <h2 className="text-3xl font-bold mb-6">
          {categories.find((c) => c.id === selectedCategory)?.name} ROMs
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredRoms.map((rom) => (
            <Link to={`/rom/${rom.id}`} key={rom.id} className="group">
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg transition-transform duration-300 ease-in-out group-hover:scale-105">
                <img
                  src={rom.coverArt}
                  alt={rom.title}
                  className="absolute inset-0 object-cover w-full h-full"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-4">
                  <h3 className="text-sm font-medium text-white">
                    {rom.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
