import {
  validateDispatch,
  DEFAULT_BUSINESS_TIME_ZONE,
} from "@/domain/validate-dispatch";
import {
  DuplicateDispatchError,
  listDispatchRequests,
  saveDispatchRequest,
} from "@/server/repositories/dispatch-repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const requests = await listDispatchRequests();
    return Response.json({ requests });
  } catch (error) {
    console.error("Failed to list dispatch requests", error);
    return Response.json(
      { error: "Unable to load dispatch requests." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const receivedAt = new Date();
  const validation = validateDispatch(
    body,
    receivedAt,
    process.env.BUSINESS_TIME_ZONE ?? DEFAULT_BUSINESS_TIME_ZONE,
  );
  if (validation.status === "Invalid") {
    return Response.json({ error: validation.reason }, { status: 400 });
  }

  try {
    const saved = await saveDispatchRequest(body, validation, receivedAt);
    return Response.json(
      {
        shipperOrderId: validation.result.shipperOrderId,
        status: validation.result.status,
        notes: validation.result.notes,
        duplicate: saved.duplicate,
        queued: !saved.duplicate,
      },
      { status: saved.duplicate ? 200 : 202 },
    );
  } catch (error) {
    if (error instanceof DuplicateDispatchError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    console.error("Failed to save dispatch request", error);
    return Response.json(
      { error: "Unable to save dispatch request." },
      { status: 500 },
    );
  }
}
