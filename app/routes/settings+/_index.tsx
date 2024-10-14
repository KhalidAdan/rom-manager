import { Button } from "@/components/ui/button";
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
import { requireUser } from "@/lib/auth/auth.server";
import { UserRoles } from "@/lib/auth/providers.server";
import { SUPPORTED_SYSTEMS_WITH_EXTENSIONS } from "@/lib/const";
import {
  filterOutUnsupportedFileTypes,
  findUniqueFileNames,
  getFilesRecursively,
  processFilePathsIntoGameObjects,
  validateFolder,
} from "@/lib/fs.server";
import { getIGDBAccessToken, scrapeRoms } from "@/lib/igdb.server";
import { prisma } from "@/lib/prisma.server";
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
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { FileWarning, Info } from "lucide-react";
import { z } from "zod";

enum Intent {
  SET_ROM_FOLDER_LOCATION = "set-rom-folder-location",
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
  intent: z.literal(Intent.SET_ROM_FOLDER_LOCATION),
  romFolderLocation: z.string(),
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
  let settings = await prisma.settings.findFirstOrThrow();
  let gamesLocked = await prisma.gameStats.findMany({
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
  });
  let users = await prisma.user.findMany({
    where: {
      id: {
        not: user.id,
      },
    },
  });

  return { settings, users, gamesLocked };
}

async function scrapeROMFolder(submission: Submission<FolderScanSchema>) {
  if (submission.status !== "success") {
    return json(submission.reply(), {
      status: submission.status === "error" ? 400 : 200,
    });
  }

  let { romFolderLocation, intent } = submission.value;

  if (intent !== Intent.SET_ROM_FOLDER_LOCATION) {
    return json(
      submission.reply({ formErrors: ["Received an unknown intent"] }),
      { status: 400 }
    );
  }

  if (!validateFolder(romFolderLocation)) {
    return json(
      submission.reply({
        formErrors: ["The folder you provided does not exist!"],
      }),
      { status: 400 }
    );
  }

  let [accessToken, rawDiskFiles] = await Promise.all([
    getIGDBAccessToken(),
    getFilesRecursively(romFolderLocation),
  ]);

  let extensions = SUPPORTED_SYSTEMS_WITH_EXTENSIONS.map(
    (system) => system.extension
  );

  let dbFiles = await prisma.game.findMany({
    select: {
      id: true,
      fileName: true,
    },
  });

  let allFiles = filterOutUnsupportedFileTypes(rawDiskFiles, extensions);
  let newFiles = findUniqueFileNames(
    dbFiles.map((db) => db.fileName),
    allFiles
  );

  let games = processFilePathsIntoGameObjects(newFiles, extensions);

  try {
    console.log("processing transaction");
    await scrapeRoms(accessToken, games);
    console.log("Folder Scanning complete!");

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

  let settings = await prisma.settings.update({
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
    case Intent.SET_ROM_FOLDER_LOCATION: {
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
  let {
    settings: {
      id,
      romFolderLocation,
      showCategoryRecs,
      showDiscovery,
      spotlightIncompleteGame,
    },
    users,
    gamesLocked,
  } = useLoaderData<typeof loader>();

  let [form, fields] = useForm({
    constraint: getZodConstraint(FolderScanSchema),
    shouldValidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: FolderScanSchema });
    },
    defaultValue: {
      id,
      romFolderLocation,
    },
  });

  let fetcher = useFetcher();

  const handleCheckboxChange = (intent: Intent, checked: boolean) => {
    fetcher.submit({ intent, value: checked.toString() }, { method: "POST" });
  };

  return (
    <div className="min-h-screen p-8 bg-muted/15">
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
              <Form
                className="grid gap-6"
                {...getFormProps(form)}
                method="POST"
              >
                <Input {...getInputProps(fields.id, { type: "hidden" })} />
                <div className="grid gap-2">
                  <Label htmlFor={fields.romFolderLocation.id}>
                    Rom folder location
                  </Label>
                  <Input
                    className="w-full"
                    {...getInputProps(fields.romFolderLocation, {
                      type: "text",
                    })}
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
              </Form>
            </CardContent>
            <CardFooter>
              <Button
                form={form.id}
                name="intent"
                value={Intent.SET_ROM_FOLDER_LOCATION}
                type="submit"
              >
                Set Directory
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
                  {users.map((user) => (
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
                  ))}
                </TableBody>
              </Table>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
