import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SUPPORTED_SYSTEMS } from "@/lib/const";
import { cn } from "@/lib/utils";
import { ThemeSwitch } from "@/routes/resources+/set-theme";
import { Form, useNavigation } from "@remix-run/react";
import { useState } from "react";

export type RomManagerType = {
  games: {
    title: string;
    location: string;
    image: undefined; // placeholder until we set up folder scanning
    system: (typeof SUPPORTED_SYSTEMS)[number];
  }[];
};

export default function RomManager({ games }: RomManagerType) {
  let navigation = useNavigation();
  let [selectedRom, setSelectedRom] = useState<string | null>(null);

  return (
    <div className="min-h-screen p-14">
      <div className="flex justify-between">
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold mb-2">Rom Manager</h1>
          <p className="text-muted-foreground mb-6">
            Built from the ground up to allow you to share your roms with
            friends.
          </p>
        </div>
        <ThemeSwitch />
      </div>

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
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {games
                      .filter((rom) => rom.system === system)
                      .map((rom) => (
                        <button
                          key={rom.title}
                          value={encodeURIComponent(rom.location)}
                          name="romLocation"
                          className={cn(
                            "relative aspect-square rounded-lg hover:bg-accent border",
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
