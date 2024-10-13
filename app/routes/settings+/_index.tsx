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
  processFolderSubmission,
  validateFolder,
} from "@/lib/fs.server";
import { getIGDBAccessToken, scrapeRoms } from "@/lib/igdb.server";
import { prisma } from "@/lib/prisma.server";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { FileWarning, Info } from "lucide-react";
import { z } from "zod";

enum Intent {
  SET_ROM_FOLDER_LOCATION = "set-rom-folder-location",
}

enum RefusalReason {
  NOT_ALLOWED = "not-allowed",
}

interface User {
  id: string;
  name: string;
  email: string;
  signupDate: string;
}

interface BorrowedGame {
  id: string;
  title: string;
  borrower: string;
  borrowDate: string;
}

let users: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    signupDate: "2024-10-01",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    signupDate: "2024-10-02",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob@example.com",
    signupDate: "2024-10-03",
  },
];

let mockBorrowedGames: BorrowedGame[] = [
  {
    id: "1",
    title: "Super Mario Bros.",
    borrower: "Alice",
    borrowDate: "2024-09-15",
  },
  {
    id: "2",
    title: "The Legend of Zelda",
    borrower: "Bob",
    borrowDate: "2024-09-20",
  },
  { id: "3", title: "Metroid", borrower: "Charlie", borrowDate: "2024-09-25" },
];

let ScanFolderSchema = z.object({
  intent: z.literal(Intent.SET_ROM_FOLDER_LOCATION),
  id: z.number(),
  romFolderLocation: z.string(),
});

let UserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  roleId: z.number(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  if (user.roleId !== UserRoles.ADMIN) {
    console.log(user.roleId, UserRoles.ADMIN);
    return redirect(`/explore?reason=${RefusalReason.NOT_ALLOWED}`);
  }
  let settings = await prisma.settings.findFirstOrThrow();

  return settings;
}

export async function action({ request }: ActionFunctionArgs) {
  let submission = await processFolderSubmission(request);

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

  console.log(accessToken);

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

export default function SettingsPage() {
  let { id, romFolderLocation } = useLoaderData<typeof loader>();

  let [form, fields] = useForm({
    constraint: getZodConstraint(ScanFolderSchema),
    shouldValidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ScanFolderSchema });
    },
    defaultValue: {
      id,
      romFolderLocation,
    },
  });

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
                    roms were renamed since last scrape, then they will be
                    re-added to your local database and you will see duplicate
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
                Manage users and create new accounts for friends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button>Create User</Button>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Signup Date</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.signupDate}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2 justify-center">
                          <Button size="sm">Approve</Button>
                          <Button size="sm" variant="destructive">
                            Decline
                          </Button>
                        </div>
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
                  {mockBorrowedGames.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>{game.title}</TableCell>
                      <TableCell>{game.borrower}</TableCell>
                      <TableCell>{game.borrowDate}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="destructive">
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                <Checkbox id="showRecommendations" checked />
                <Label htmlFor="showRecommendations">
                  Show Category Recommendation (e.g Adventure, Role Playing
                  Games) Lists
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="showDiscoveryQueue" checked />
                <Label htmlFor="showDiscoveryQueue">Show Discovery Queue</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="showIncompleteGameData" checked />
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
