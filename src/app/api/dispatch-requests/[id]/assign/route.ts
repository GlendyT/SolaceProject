import { assignDispatch, DispatchAlreadyAssignedError, DispatchNotFoundError } from "@/server/repositories/dispatch-repository";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const carrierId = typeof body === "object" && body !== null && "carrierId" in body && typeof body.carrierId === "string" ? body.carrierId.trim() : "";
  if (!carrierId || carrierId.length > 100) return Response.json({ error: "carrierId is required." }, { status: 400 });
  try { return Response.json(await assignDispatch(id, carrierId)); }
  catch (error) { if (error instanceof DispatchNotFoundError) return Response.json({ error: error.message }, { status: 404 }); if (error instanceof DispatchAlreadyAssignedError) return Response.json({ error: error.message }, { status: 409 }); console.error("Failed to assign dispatch", error); return Response.json({ error: "Unable to assign dispatch." }, { status: 500 }); }
}
