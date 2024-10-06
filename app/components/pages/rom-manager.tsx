import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SUPPORTED_SYSTEMS } from "@/lib/const";
import { cn } from "@/lib/utils";
import { Form, useNavigation } from "@remix-run/react";
import { useState } from "react";

export type RomManagerType = {
  games: {
    title: string;
    location: string;
    image: undefined; // placeholder until we set up folder scanning
    system: (typeof SUPPORTED_SYSTEMS)[number];
  }[];
  actionData:
    | {
        romName: string;
      }
    | undefined;
};

export default function RomManager({ games, actionData }: RomManagerType) {
  let navigation = useNavigation();
  let [selectedRom, setSelectedRom] = useState<string | null>(null);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-2">Rom Manager</h1>
      <p className="text-muted-foreground mb-6">
        Built from the ground up to allow you to share your roms with friends.
      </p>

      <Card className="">
        <CardContent className="p-6">
          <Tabs defaultValue="GBA">
            <TabsList className="mb-6">
              {SUPPORTED_SYSTEMS.map((system) => (
                <TabsTrigger key={system} value={system} className="">
                  {system}
                </TabsTrigger>
              ))}
            </TabsList>
            {SUPPORTED_SYSTEMS.map((system) => (
              <TabsContent key={system} value={system}>
                <Form method="POST">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {games
                      .filter((rom) => rom.system === system)
                      .map((rom) => (
                        <button
                          key={rom.title}
                          value={rom.location}
                          name="romName"
                          className={cn(
                            "relative aspect-[9/9] rounded-lg hover:bg-accent border",
                            {
                              active: selectedRom === rom.title,
                            }
                          )}
                          type="submit"
                          onClick={() => setSelectedRom(rom.title)}
                          disabled={navigation.state === "submitting"}
                        >
                          {rom.title}
                        </button>
                      ))}
                  </div>
                </Form>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
