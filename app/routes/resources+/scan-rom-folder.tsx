import { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  let body = await request.json();
  console.log(body);
  return null;
}
