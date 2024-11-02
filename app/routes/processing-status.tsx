import { Button } from "@/components/atoms/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { processQueuedGames } from "@/lib/jobs";
import { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  void processQueuedGames(150);
  return null;
}

export default function ProcessingStatus() {
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
          <CardDescription>Contact Admin for any issues</CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col items-center space-y-4">
          <Button className="w-full" size="lg">
            Check Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
