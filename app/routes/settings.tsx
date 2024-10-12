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
import { prisma } from "@/lib/prisma.server";
import { getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Info } from "lucide-react";
import { z } from "zod";

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

enum RefusalReason {
  NOT_ALLOWED = "not-allowed",
}

export async function loader({ request }: LoaderFunctionArgs) {
  let user = await requireUser(request);
  if (user.roleId !== UserRoles.ADMIN) {
    console.log(user.roleId, UserRoles.ADMIN);
    return redirect(`/explore?reason=${RefusalReason.NOT_ALLOWED}`);
  }
  let settings = await prisma.settings.findFirstOrThrow();

  return settings;
}

let SettingsSchema = z.object({
  id: z.number(),
  romFolderLocation: z.string().optional(),
  categoryRecs: z.string().optional(),
  discoveryQueue: z.string().optional(),
});

let UserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  roleId: z.number(),
});

export default function SettingsPage() {
  let { id, romFolderLocation } = useLoaderData<typeof loader>();

  let [form, fields] = useForm({
    constraint: getZodConstraint(SettingsSchema),
    shouldValidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: SettingsSchema });
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
              <form className="space-y-4">
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="romFolder">ROM Folder Path</Label>
                  <Input
                    {...getInputProps(fields.romFolderLocation, {
                      type: "text",
                    })}
                  />
                  <p className="flex items-center gap-2 pt-2">
                    <Info size={18} /> We automatically uploads your ROMs to
                    your local server (on your computer, using SQLite) so you
                    can edit this location to scan other folders
                  </p>
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button>Scan for Updates</Button>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
