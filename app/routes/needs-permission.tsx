import { Button, buttonVariants } from "@/components/atoms/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { getUser } from "@/lib/auth/auth.server";
import { UserRoles } from "@/lib/auth/providers.server";
import { prisma } from "@/lib/prisma.server";
import { cn } from "@/lib/utils";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

export async function loader({ request }: LoaderFunctionArgs) {
  let userData = await getUser(request);
  if (!userData.user?.signupVerifiedAt) {
    let admin = await prisma.user.findFirst({
      where: {
        roleId: { equals: UserRoles.ADMIN },
      },
    });

    if (!admin) return { adminEmail: null };

    return { adminEmail: admin.email };
  }
  throw redirect("/explore");
}

export default function PendingActivation() {
  let { adminEmail } = useLoaderData<typeof loader>();
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center z-0 blur"
        style={{ backgroundImage: "url('/explore.jpg')" }}
      />
      <div className="absolute inset-0 bg-black opacity-75"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/5 to-black max-h-screen" />
      <div className="absolute inset-0 bg-gradient-to-t from-black from-1% via-black/10 to-transparent max-h-screen" />

      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-black/10 to-transparent z-10"></div>
      <Card className="relative z-20 w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Account Activation Pending</CardTitle>
          <CardDescription>
            Contact Admin for
            <span className="italic font-mono text-base">{" ROMSTHO "}</span>
            Access
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col items-center space-y-4">
          {!adminEmail ? (
            <Link
              className={cn(buttonVariants({ size: "lg" }), "w-full")}
              to={`mailto:${adminEmail}`}
            >
              Check Again
            </Link>
          ) : (
            <Button className="w-full" size="lg" disabled>
              Admin's email not configured{" "}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
