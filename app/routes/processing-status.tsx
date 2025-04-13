import { Button } from "@/components/atoms/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { processQueuedGames } from "@/lib/jobs";
import { prisma } from "@/lib/prisma.server";
import {
  ActionFunctionArgs,
  Form,
  redirect,
  useActionData,
  useNavigation,
} from "react-router";

export async function loader() {
  const jobs = await prisma.metadataJob.findMany({
    where: { status: "PENDING" },
  });

  if (jobs.length === 0) {
    redirect("/explore");
  }

  void processQueuedGames();
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  let [pending, completed, failed] = await Promise.all([
    prisma.metadataJob.count({ where: { status: "PENDING" } }),
    prisma.metadataJob.count({ where: { status: "COMPLETED" } }),
    prisma.metadataJob.count({ where: { status: "FAILED" } }),
  ]);

  console.log(
    `Pending: ${pending}, Completed: ${completed}, Failed: ${failed}, Total: ${
      pending + completed + failed
    }`
  );

  if (pending === 0 && (completed > 0 || failed > 0)) {
    return redirect("/explore");
  }

  let total = pending + completed + failed;
  let progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    pending,
    completed,
    failed,
    total,
    progress,
  };
}

export default function ProcessingStatus() {
  let navigation = useNavigation();
  let actionData = useActionData<{
    pending: number;
    completed: number;
    failed: number;
    total: number;
    progress: number;
  }>();
  let isChecking = navigation.state === "submitting";

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
          <CardTitle>We're setting you up, pulling all your ROM info</CardTitle>
          <CardDescription>
            {actionData && (
              <div className="mt-4 text-sm">
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${actionData.progress}%` }}
                  />
                </div>
                <p className="mt-2">
                  Processed {actionData.completed} of {actionData.total} ROMs
                  {actionData.failed > 0 && ` (${actionData.failed} failed)`}
                </p>
              </div>
            )}
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex flex-col items-center space-y-4">
          <Form method="post" className="w-full">
            <Button className="w-full" size="lg" disabled={true}>
              {isChecking ? "Checking Status..." : "Check Progress"}
            </Button>
          </Form>
        </CardFooter>
      </Card>
    </div>
  );
}
