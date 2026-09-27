import {
  cancelDispatch,
  DispatchAlreadyAssignedError,
  DispatchNotFoundError,
} from "@/server/repositories/dispatch-repository";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let reason = "Cancelada por el transportista.";
  try {
    const body = (await request.json()) as { reason?: string };
    if (body?.reason && typeof body.reason === "string") {
      reason = body.reason.trim();
    }
  } catch {
    // optional body, use default reason
  }

  try {
    return Response.json(await cancelDispatch(id, reason));
  } catch (error) {
    if (error instanceof DispatchNotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DispatchAlreadyAssignedError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("Failed to cancel dispatch", error);
    return Response.json(
      { error: "Unable to cancel dispatch." },
      { status: 500 },
    );
  }
}
