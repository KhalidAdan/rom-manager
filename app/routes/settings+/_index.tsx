import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsSubmitting } from "@/hooks/use-is-submitting";
import { requireUser } from "@/lib/auth/auth.server";
import { UserRoles } from "@/lib/auth/providers.server";
import { MAX_FILES, SUPPORTED_SYSTEMS_WITH_EXTENSIONS } from "@/lib/const";
import {
  filterOutUnsupportedFileTypes,
  findUniqueFileNames,
  processUploadedDirectory,
} from "@/lib/fs.server";
import { processQueuedGames, queueGamesForProcessing } from "@/lib/jobs";
import { prisma } from "@/lib/prisma.server";
import { cn } from "@/lib/utils";
import {
  getFormProps,
  getInputProps,
  Submission,
  useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, Link, useFetcher, useLoaderData } from "@remix-run/react";
import { FileWarning, Info, Loader } from "lucide-react";
import { useCallback, useState } from "react";
import { z } from "zod";

enum Intent {
  UPLOAD_ROMS = "upload-roms",
  DISALLOW_SIGNUP = "disallow-signup",
  ALLOW_SIGNUP = "allow-signup",
  UPDATE_SHOW_CATEGORY_RECS = "update-show-category-recs",
  UPDATE_SHOW_DISCOVERY = "update-show-discovery",
  UPDATE_SPOTLIGHT_INCOMPLETE_GAME = "update-spotlight-incomplete-game",
}

enum RefusalReason {
  NOT_ALLOWED = "not-allowed",
}

let FolderScanSchema = z.object({
  id: z.number().optional(),
  intent: z.literal(Intent.UPLOAD_ROMS),
  roms: z
    .array(z.instanceof(File))
    .min(1, "Please select at least one ROM file")
    .max(
      MAX_FILES,
      `Too many files selected. Please select ${MAX_FILES} or fewer files.`
    )
    .refine(
      (files) =>
        files.every((file) =>
          SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(
            (system) => system.extension
          ).some((ext) => file.name.toLowerCase().endsWith(ext))
        ),
      `All files must be of supported types: ${SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(
        (system) => system.title
      ).join(", ")}`
    ),
});

type FolderScanSchema = z.infer<typeof FolderScanSchema>;

let AllowSignup = z.object({
  userId: z.number(),
  intent: z.literal(Intent.ALLOW_SIGNUP),
});

type AllowSignup = z.infer<typeof AllowSignup>;

let DisallowSignup = z.object({
  userId: z.number(),
  intent: z.literal(Intent.DISALLOW_SIGNUP),
});

type DisallowSignup = z.infer<typeof DisallowSignup>;

let UpdateSettingSchema = z.object({
  intent: z.enum([
    Intent.UPDATE_SHOW_CATEGORY_RECS,
    Intent.UPDATE_SHOW_DISCOVERY,
    Intent.UPDATE_SPOTLIGHT_INCOMPLETE_GAME,
  ]),
  value: z
    .enum(["0", "1", "true", "false"])
    .catch("false")
    .transform((value) => value == "true" || value == "1"),
});

type UpdateSettingSchema = z.infer<typeof UpdateSettingSchema>;

export async function loader({ request }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  if (user.roleId !== UserRoles.ADMIN) {
    return redirect(`/explore?reason=${RefusalReason.NOT_ALLOWED}`);
  }

  let [settings, users, gamesLocked] = await Promise.all([
    prisma.settings.findFirstOrThrow(),
    prisma.user.findMany({
      where: {
        id: {
          not: user.id,
        },
      },
    }),
    prisma.gameStats.findMany({
      where: {
        game: {
          userId: {
            not: null,
          },
        },
      },
      include: {
        game: {
          include: {
            borrowedBy: true,
            system: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return { settings, users, gamesLocked };
}

async function scrapeROMFolder(submission: Submission<FolderScanSchema>) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { roms, intent } = submission.value;

  if (intent !== Intent.UPLOAD_ROMS) {
    return json(
      submission.reply({ formErrors: ["Received an unknown intent"] }),
      { status: 400 }
    );
  }

  let extensions = SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(
    (system) => system.extension
  );

  let rawDiskFiles = await processUploadedDirectory(roms, extensions);

  let dbFiles = await prisma.game.findMany({
    select: {
      id: true,
      fileName: true,
    },
  });

  let allFiles = filterOutUnsupportedFileTypes(rawDiskFiles, extensions);
  let newFiles = findUniqueFileNames(
    dbFiles.map((db) => db.fileName),
    allFiles.map((file) => file)
  );

  console.log("Files to be queued for processing:", newFiles);
  await queueGamesForProcessing(newFiles);
  try {
    console.log("Starting processing of files...");
    let processedCount = await processQueuedGames(150);
    console.log(`ROM processing complete! Processed ${processedCount} files.`);

    return redirect("/explore");
  } catch (error) {
    console.error("Folder scanning transaction failed: ", error);
    return json(submission.reply(), { status: 500 });
  }
}

async function allowSignup(submission: Submission<AllowSignup>) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { userId } = submission.value;
  return await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      signupVerifiedAt: new Date(),
    },
  });
}

async function disallowSignup(submission: Submission<DisallowSignup>) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }
  let { userId } = submission.value;

  return await prisma.user.delete({
    where: {
      id: userId,
    },
    include: {
      sessions: true,
      gameStats: true,
      Game: true,
    },
  });
}

async function updateSetting(submission: Submission<UpdateSettingSchema>) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { intent, value } = submission.value;

  let updateData: Partial<{
    showCategoryRecs: boolean;
    showDiscovery: boolean;
    spotlightIncompleteGame: boolean;
  }> = {};

  switch (intent) {
    case Intent.UPDATE_SHOW_CATEGORY_RECS:
      updateData.showCategoryRecs = value;
      break;
    case Intent.UPDATE_SHOW_DISCOVERY:
      updateData.showDiscovery = value;
      break;
    case Intent.UPDATE_SPOTLIGHT_INCOMPLETE_GAME:
      updateData.spotlightIncompleteGame = value;
      break;
  }

  await prisma.settings.update({
    where: { id: 1 },
    data: updateData,
  });

  return json({ success: true });
}

export async function action({ request }: ActionFunctionArgs) {
  await requireUser(request);
  let formData = await request.formData();
  let intent = formData.get("intent");

  switch (intent) {
    case Intent.UPLOAD_ROMS: {
      let submission = parseWithZod(formData, {
        schema: FolderScanSchema,
      });
      return await scrapeROMFolder(submission);
    }
    case Intent.ALLOW_SIGNUP: {
      let submission = parseWithZod(formData, {
        schema: AllowSignup,
      });
      return await allowSignup(submission);
    }
    case Intent.DISALLOW_SIGNUP: {
      let submission = parseWithZod(formData, {
        schema: DisallowSignup,
      });
      return await disallowSignup(submission);
    }
    case Intent.UPDATE_SHOW_CATEGORY_RECS:
    case Intent.UPDATE_SHOW_DISCOVERY:
    case Intent.UPDATE_SPOTLIGHT_INCOMPLETE_GAME: {
      let submission = parseWithZod(formData, {
        schema: UpdateSettingSchema,
      });
      return await updateSetting(submission);
    }
    default: {
      throw new Error("Invalid intent");
    }
  }
}

export default function SettingsPage() {
  let [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  let {
    settings: { id, showCategoryRecs, showDiscovery, spotlightIncompleteGame },
    users,
    gamesLocked,
  } = useLoaderData<typeof loader>();

  let [form, fields] = useForm({
    constraint: getZodConstraint(FolderScanSchema),
    shouldValidate: "onSubmit",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: FolderScanSchema });
    },
    defaultValue: {
      id,
    },
  });

  let fetcher = useFetcher({ key: "settings-fetcher" });
  let isSubmitting = useIsSubmitting({
    formMethod: "POST",
    formAction: "/settings",
  });

  let handleCheckboxChange = (intent: Intent, checked: boolean) => {
    fetcher.submit({ intent, value: checked.toString() }, { method: "POST" });
  };

  let handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let files = event.target.files;
      if (files) {
        let filteredFiles = Array.from(files).filter((file) =>
          SUPPORTED_SYSTEMS_WITH_EXTENSIONS.some((system) =>
            file.name.toLowerCase().endsWith(system.extension)
          )
        );
        console.log(filteredFiles);
        setSelectedFiles(filteredFiles);
      }
    },
    []
  );

  let handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      console.log(selectedFiles);
      event.preventDefault();
      let formData = new FormData();
      formData.append("intent", Intent.UPLOAD_ROMS);
      selectedFiles.forEach((file) => formData.append("roms", file));
      fetcher.submit(formData, {
        method: "POST",
        encType: "multipart/form-data",
      });
    },
    [selectedFiles, fetcher]
  );

  return (
    <div className="min-h-screen p-8 bg-muted/15">
      <header className="max-w-6xl mx-auto flex justify-between mb-14">
        <h1 className="text-2xl font-bold mb-4 tracking-tight font-mono italic">
          {"{"} ROMSTHO {"}"}
        </h1>
        <Link
          to="/explore"
          className={cn(
            buttonVariants({ variant: "link" }),
            "font-mono italic"
          )}
        >
          Explore
        </Link>
      </header>
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>ROM Folder Settings</CardTitle>
              <CardDescription>
                Manage your ROM folder location and scan for updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <fetcher.Form
                className="grid gap-6"
                {...getFormProps(form)}
                method="POST"
                encType="multipart/form-data"
                onSubmit={handleSubmit}
              >
                <Input {...getInputProps(fields.id, { type: "hidden" })} />
                <div className="grid gap-2">
                  <Label htmlFor={fields.roms.id}>Rom folder location</Label>
                  <Input
                    className="w-full"
                    {...getInputProps(fields.roms, {
                      type: "file",
                    })}
                    onChange={handleFileChange}
                    webkitdirectory=""
                    directory=""
                    multiple
                  />
                  <p className="flex items-center gap-2 pt-1 text-sm">
                    <Info className="text-blue-500" size={18} /> ROMSTHO
                    automatically upload your ROMs to your local database (on
                    your computer via SQLite) so you can edit this location to
                    scan other folders
                  </p>
                  <p className="flex items-center gap-2 pt-1 text-sm">
                    <FileWarning className="text-amber-500" size={18} /> If your
                    ROMs were renamed since last scrape, then they will be
                    re-added to your local database and you will see duplicates!
                  </p>
                </div>
              </fetcher.Form>
            </CardContent>
            <CardFooter>
              <Button
                form={form.id}
                name="intent"
                value={Intent.UPLOAD_ROMS}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="animate-spin mr-2" /> Scraping...
                  </>
                ) : (
                  "Select ROM folder"
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Allow and disallow signups, and delete users off of your server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {users.length > 0 ? (
                users.map((user) => (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Signup Date</TableHead>
                        <TableHead>Allow Date</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {user.signupVerifiedAt &&
                            new Date(user.signupVerifiedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Form method="POST">
                            <Input
                              name="userId"
                              id="userId"
                              type="hidden"
                              value={user.id}
                            />
                            <div className="flex space-x-2 justify-center">
                              {user.signupVerifiedAt == null && (
                                <Button
                                  name="intent"
                                  value={Intent.ALLOW_SIGNUP}
                                  size="sm"
                                  type="submit"
                                >
                                  Approve
                                </Button>
                              )}
                              <Button
                                name="intent"
                                value={Intent.DISALLOW_SIGNUP}
                                size="sm"
                                variant="destructive"
                                type="submit"
                              >
                                {user.signupVerifiedAt == null
                                  ? "Decline"
                                  : "Delete"}
                              </Button>
                            </div>
                          </Form>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ))
              ) : (
                <p className="text-center my-4">
                  No users yet, invite some people to sign up!
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Borrowed Games</CardTitle>
              <CardDescription>
                Manage games currently borrowed by users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gamesLocked.length > 0 ? (
                gamesLocked.map((gameStats) => (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Game Title</TableHead>
                        <TableHead>Borrower</TableHead>
                        <TableHead>Borrow Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow key={gameStats.id}>
                        <TableCell>{gameStats.game.title}</TableCell>
                        <TableCell>{gameStats.user.email}</TableCell>
                        <TableCell>{gameStats.lastPlayedAt}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="destructive">
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ))
              ) : (
                <p className="text-center my-4">
                  No borrow vouchers have been given out
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Explore Page Settings</CardTitle>
              <CardDescription>
                Customize your explore page experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showRecommendations"
                  defaultChecked={showCategoryRecs}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(
                      Intent.UPDATE_SHOW_CATEGORY_RECS,
                      checked as boolean
                    )
                  }
                />
                <Label htmlFor="showRecommendations">
                  Show Category Recommendation (e.g Adventure, Role Playing
                  Games) Lists
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showDiscoveryQueue"
                  defaultChecked={showDiscovery}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(
                      Intent.UPDATE_SHOW_DISCOVERY,
                      checked as boolean
                    )
                  }
                />
                <Label htmlFor="showDiscoveryQueue">Show Discovery Queue</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showIncompleteGameData"
                  checked={spotlightIncompleteGame}
                  onCheckedChange={(checked) =>
                    handleCheckboxChange(
                      Intent.UPDATE_SPOTLIGHT_INCOMPLETE_GAME,
                      checked as boolean
                    )
                  }
                />
                <Label htmlFor="showIncompleteGameData">
                  Spotlight games that have incomplete information (like missing
                  art, summaries, etc.)
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
