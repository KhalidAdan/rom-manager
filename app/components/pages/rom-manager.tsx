import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SUPPORTED_SYSTEMS_WITH_EXTENSIONS } from "@/lib/const";
import { cn } from "@/lib/utils";
import { ThemeSwitch } from "@/routes/resources+/set-theme";
import { Form, useNavigation } from "@remix-run/react";
import { Dispatch, SetStateAction } from "react";

export type RomManagerType = {
  games: {
    title: string;
    location: string;
    image: undefined; // placeholder until we set up folder scanning
    system: (typeof SUPPORTED_SYSTEMS_WITH_EXTENSIONS)[number];
  }[];
  setSelectedSystem: Dispatch<SetStateAction<string>>;
};

export default function RomManager({
  games,
  setSelectedSystem,
}: RomManagerType) {
  let navigation = useNavigation();

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

      <Card>
        <CardContent className="p-6">
          <Tabs
            defaultValue="GBA"
            onValueChange={(value) =>
              setSelectedSystem(
                value === "GBC" ? "gb" : value.toLocaleLowerCase()
              )
            }
          >
            <TabsList className="mb-6">
              {SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(({ title, extension }) => (
                <TabsTrigger key={title} value={title}>
                  {title}
                </TabsTrigger>
              ))}
            </TabsList>
            {SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(({ title, extension }) => (
              <TabsContent key={title} value={title}>
                <Form method="POST">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {games
                      .filter((rom) => rom.system.title === title)
                      .map((rom) => (
                        <button
                          key={rom.title}
                          value={encodeURIComponent(rom.location)}
                          name="romLocation"
                          className={cn(
                            "relative aspect-square rounded-lg hover:bg-accent border"
                          )}
                          type="submit"
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
