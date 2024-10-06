import { LoaderFunctionArgs } from "@remix-run/node";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";

export async function loader({ request }: LoaderFunctionArgs) {
  let url = new URL(request.url);
  let filePath = url.searchParams.get("path");

  if (!filePath) {
    return new Response("ROM path is required", { status: 400 });
  }

  try {
    let allowedDirectory = process.env.ROM_DIRECTORY || "e:\\R O M Z";
    let fullPath = path.resolve(allowedDirectory, filePath);

    if (!fullPath.startsWith(allowedDirectory)) {
      return new Response("Invalid ROM path", { status: 403 });
    }

    if (!existsSync(fullPath)) {
      return new Response("File not found", { status: 404 });
    }

    let fileName = path.basename(fullPath);
    let stat = statSync(fullPath);

    let headers = new Headers();
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${fileName}"`);
    headers.set("Content-Length", stat.size.toString());

    return new Response(
      new ReadableStream({
        start(controller) {
          let stream = createReadStream(fullPath);
          stream.on("data", (chunk) => controller.enqueue(chunk));
          stream.on("end", () => controller.close());
          stream.on("error", (err) => controller.error(err));
        },
      }),
      { headers }
    );
  } catch (error) {
    console.error("Error serving ROM:", error);
    return new Response("Error serving ROM", { status: 500 });
  }
}
