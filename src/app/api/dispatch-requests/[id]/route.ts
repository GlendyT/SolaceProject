import { getDispatchRequest } from "@/server/repositories/dispatch-repository";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const request = await getDispatchRequest(id);
    if (!request) return Response.json({ error: "Dispatch request was not found." }, { status: 404 });
    return Response.json({ request });
  } catch (error) {
    console.error("Failed to load dispatch request", error);
    return Response.json({ error: "Unable to load dispatch request." }, { status: 500 });
  }
}
