import { DateTime } from "luxon";
import { createAvailableEvent, createResultEvent } from "@/domain/events";
import type { DispatchValidationResult } from "@/domain/dispatch-schema";
import { withTransaction } from "@/server/db/pool";

export class DuplicateDispatchError extends Error {
  constructor(message = "A request with this shipperOrderId already exists with different data.") {
    super(message);
    this.name = "DuplicateDispatchError";
  }
}

type SavedRequest = { duplicate: boolean; shipperOrderId: string };

function validDateOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = DateTime.fromFormat(value, "yyyy-MM-dd", { zone: "UTC" });
  return parsed.isValid && parsed.toFormat("yyyy-MM-dd") === value ? value : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function getPayload(result: DispatchValidationResult) {
  return result.ok && result.status === "Accepted" ? result.payload : undefined;
}

export async function saveDispatchRequest(
  input: unknown,
  validation: Exclude<DispatchValidationResult, { status: "Invalid" }>,
  receivedAt: Date,
): Promise<SavedRequest> {
  const shipperOrderId = validation.result.shipperOrderId;
  const rawPayload = JSON.stringify(input ?? null);
  const payload = getPayload(validation);
  const topicPrefix = (process.env.SOLACE_TOPIC_PREFIX ?? "newcron/dispatch/v1").replace(/\/$/, "");
  const events = payload
    ? [
        { event: createAvailableEvent(payload, receivedAt), topic: `${topicPrefix}/available/${shipperOrderId}` },
        { event: createResultEvent(validation.result, receivedAt), topic: `${topicPrefix}/result/accepted/${shipperOrderId}` },
      ]
    : [{ event: createResultEvent(validation.result, receivedAt), topic: `${topicPrefix}/result/cancelled/${shipperOrderId}` }];

  return withTransaction(async (client) => {
    const existing = await client.query<{ same: boolean }>(
      "SELECT raw_payload = $2::jsonb AS same FROM dispatch_requests WHERE shipper_order_id = $1 FOR UPDATE",
      [shipperOrderId, rawPayload],
    );
    if (existing.rowCount) {
      if (existing.rows[0].same) return { duplicate: true, shipperOrderId };
      throw new DuplicateDispatchError();
    }

    await client.query(
      `INSERT INTO dispatch_requests
        (shipper_order_id, pickup_date, delivery_date, price, raw_payload, validation_status, cancellation_reason, received_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
      [
        shipperOrderId,
        validDateOrNull((input as Record<string, unknown>)?.pickupDate),
        validDateOrNull((input as Record<string, unknown>)?.deliveryDate),
        numberOrNull((input as Record<string, unknown>)?.price),
        rawPayload,
        validation.status,
        validation.status === "Cancelled" ? validation.reason : null,
        receivedAt,
      ],
    );

    for (const { event, topic } of events) {
      await client.query(
        `INSERT INTO outbox_events (event_id, shipper_order_id, event_type, topic, payload)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [event.eventId, shipperOrderId, event.eventType, topic, JSON.stringify(event)],
      );
    }
    return { duplicate: false, shipperOrderId };
  });
}
