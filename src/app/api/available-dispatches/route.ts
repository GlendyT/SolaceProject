import { listAvailableDispatches } from "@/server/repositories/dispatch-repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ dispatches: await listAvailableDispatches() });
  } catch (error) {
    console.error("Failed to list available dispatches", error);
    return Response.json({ error: "Unable to load available dispatches." }, { status: 500 });
  }
}
