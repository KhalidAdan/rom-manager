import {
  prettifyROMTitles,
  SUPPORTED_SYSTEMS_WITH_EXTENSIONS,
} from "@/lib/const";
import { ThemeSwitch } from "@/routes/resources+/set-theme";
import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod";
import { Form, useNavigation } from "@remix-run/react";
import { Dispatch, SetStateAction } from "react";
import { z } from "zod";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";

export type RomManagerType = {
  games: {
    title: string;
    location: string;
    image: null; // placeholder until we set up folder scanning
    system: (typeof SUPPORTED_SYSTEMS_WITH_EXTENSIONS)[number];
  }[];
  setSelectedSystem: Dispatch<SetStateAction<string>>;
  [key: string]: unknown;
};

export let RomSelectionSchema = z.object({
  romLocation: z.string({ required_error: "The rom location is required" }),
});

export default function RomManager({
  games,
  setSelectedSystem,
}: RomManagerType) {
  let navigation = useNavigation();
  let [form] = useForm({
    constraint: getZodConstraint(RomSelectionSchema),
  });

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
      <div className="space-y-12">
        {SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(({ title }) => (
          <div key={title} className="space-y-4">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {games
                  .filter((rom) => rom.system.title === title)
                  .map((rom) => (
                    <CarouselItem
                      key={rom.title}
                      className="pl-2 md:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                    >
                      <Form method="POST" {...getFormProps(form)}>
                        <button
                          className="aspect-[3/4] relative group cursor-pointer overflow-hidden rounded-lg"
                          key={rom.title}
                          value={encodeURIComponent(rom.location)}
                          name="romLocation"
                          type="submit"
                          disabled={navigation.state === "submitting"}
                        >
                          <img
                            src={rom.image ?? "https://placehold.co/600x800"}
                            alt={rom.title}
                            className="transition-transform duration-300 ease-in-out object-cover group-hover:scale-110"
                          />
                          <div className="absolute inset-0 text-white bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-75 transition-opacity duration-300 p-4">
                            <p className="absolute bottom-10 left-2 right-2 text-2xl font-medium text-center">
                              {prettifyROMTitles(rom.title)}
                            </p>
                          </div>
                        </button>
                      </Form>
                    </CarouselItem>
                  ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        ))}
      </div>
    </div>
  );
}
